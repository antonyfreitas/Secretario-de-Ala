import { supabase } from './supabase';
import { limpar, type Ata, type Dados, type Situacao } from './tipos';

export type Resultado = 'ok' | 'conflito' | 'erro';
export type Acao = 'enviar_para_revisao' | 'aprovar_ata' | 'devolver_ata' | 'reabrir_ata';
export interface Versao { versao: number; aprovadaEm: string; aprovadaPorNome: string | null; hash: string; d: Dados }

const COLUNAS = 'id,d,criado_em,atualizado_em,status,versao,comentario,enviada_por,enviada_por_nome,aprovada_por_nome,aprovada_em';

export async function listarAtas(): Promise<Ata[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('atas_ala').select(COLUNAS).order('data', { ascending: false });
  if (error) return null;
  return (data ?? []).map((r) => ({
    v: 1 as const,
    id: r.id as string,
    criado: r.criado_em as string,
    atualizado: r.atualizado_em as string,
    d: limpar(r.d),
    status: r.status as Situacao,
    versao: r.versao as number,
    comentario: (r.comentario as string | null) ?? null,
    enviadaPor: (r.enviada_por as string | null) ?? null,
    enviadaPorNome: (r.enviada_por_nome as string | null) ?? null,
    aprovadaPorNome: (r.aprovada_por_nome as string | null) ?? null,
    aprovadaEm: (r.aprovada_em as string | null) ?? null,
  }));
}

/** Sem `anterior`, cria. Com `anterior`, só altera se ninguém mexeu na ata desde então (evita sobrescrever). */
export async function gravarAta(a: Ata, anterior?: string): Promise<Resultado> {
  if (!supabase) return 'erro';
  const campos = { data: a.d.data || null, pronta: a.d.pronta, d: a.d };
  if (!anterior) {
    const { error } = await supabase.from('atas_ala').insert({ id: a.id, ...campos });
    return error ? 'erro' : 'ok';
  }
  const { data, error } = await supabase.from('atas_ala').update(campos).eq('id', a.id).eq('atualizado_em', anterior).select('id');
  if (error) return 'erro';
  return data && data.length ? 'ok' : 'conflito';
}

export async function excluirAta(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('atas_ala').delete().eq('id', id);
  return !error;
}

/** Enviar para revisão, aprovar, devolver ou reabrir. Retorna a mensagem de erro, ou null se deu certo. */
export async function acaoAta(acao: Acao, id: string, motivo?: string): Promise<string | null> {
  if (!supabase) return 'servidor não configurado';
  const args = acao === 'devolver_ata' ? { p_id: id, p_motivo: motivo ?? '' } : { p_id: id };
  const { error } = await supabase.rpc(acao, args);
  return error ? error.message : null;
}

export async function listarVersoes(id: string): Promise<Versao[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('atas_versoes').select('versao,d,hash,aprovada_em,aprovada_por_nome').eq('ata_id', id).order('versao', { ascending: false });
  return (data ?? []).map((r) => ({
    versao: r.versao as number,
    aprovadaEm: r.aprovada_em as string,
    aprovadaPorNome: (r.aprovada_por_nome as string | null) ?? null,
    hash: r.hash as string,
    d: limpar(r.d),
  }));
}
