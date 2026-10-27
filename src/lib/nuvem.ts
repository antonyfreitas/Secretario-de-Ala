import { supabase } from './supabase';
import { limpar, type Ata, type Dados } from './tipos';

export type Resultado = 'ok' | 'conflito' | 'erro';
export interface Org { id: string; nome: string; nuvem: boolean }
export interface Destinatario { id: string; org_id: string; nome: string; papel: string; email: string | null; whatsapp: string | null }
export interface Edicao { em: string; por: string | null; d: Dados }

const COLUNAS = 'id,d,criado_em,atualizado_em,atualizado_por_nome,org_id';

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
    orgId: r.org_id as string,
    atualizadoPorNome: (r.atualizado_por_nome as string | null) ?? null,
  }));
}

/** Sem `anterior`, cria. Com `anterior`, só altera se ninguém mexeu na ata desde então (evita sobrescrever). */
export async function gravarAta(a: Ata, anterior?: string): Promise<Resultado> {
  if (!supabase) return 'erro';
  const campos = { data: a.d.data || null, pronta: a.d.pronta, d: a.d };
  if (!anterior) {
    const { error } = await supabase.from('atas_ala').insert({ id: a.id, ...campos, ...(a.orgId ? { org_id: a.orgId } : {}) });
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

export async function listarHistorico(id: string): Promise<Edicao[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('atas_historico').select('d,editado_em,editado_por_nome').eq('ata_id', id).order('editado_em', { ascending: false });
  return (data ?? []).map((r) => ({ em: r.editado_em as string, por: (r.editado_por_nome as string | null) ?? null, d: limpar(r.d) }));
}

export async function listarOrgs(): Promise<Org[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('organizacoes').select('id,nome,nuvem_ativa').order('nome');
  return (data ?? []).map((r) => ({ id: r.id as string, nome: r.nome as string, nuvem: r.nuvem_ativa === true }));
}

export async function listarDestinatarios(orgId: string): Promise<Destinatario[]> {
  if (!supabase || !orgId) return [];
  const { data } = await supabase.from('destinatarios').select('id,org_id,nome,papel,email,whatsapp').eq('org_id', orgId).order('criado_em');
  return (data ?? []) as Destinatario[];
}
