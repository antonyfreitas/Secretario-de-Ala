import { diasDesde } from './datas';
import { supabase } from './supabase';

export const TIPOS: Record<string, string> = { recomendacao: 'Recomendação', chamado: 'Chamado', ministracao: 'Ministração', acompanhamento: 'Acompanhamento', outro: 'Outro' };
export interface Entrevista { id: string; data: string; pessoa: string; entrevistador: string; tipo: string; assunto: string; por: string | null }
export type NovaEntrevista = Omit<Entrevista, 'id' | 'por'> & { id?: string };

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export async function listarEntrevistas(): Promise<Entrevista[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('entrevistas').select('id,data,pessoa,entrevistador,tipo,assunto,atualizado_por_nome').order('data', { ascending: false });
  if (error) return null;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    data: r.data as string,
    pessoa: r.pessoa as string,
    entrevistador: r.entrevistador as string,
    tipo: r.tipo as string,
    assunto: (r.assunto as string | null) ?? '',
    por: (r.atualizado_por_nome as string | null) ?? null,
  }));
}

/** Retorna a mensagem de erro, ou null se deu certo. */
export async function gravarEntrevista(e: NovaEntrevista): Promise<string | null> {
  if (!supabase) return 'servidor não configurado';
  const campos = { data: e.data, pessoa: e.pessoa.trim(), entrevistador: e.entrevistador.trim(), tipo: e.tipo, assunto: e.assunto.trim() || null };
  const { error } = e.id
    ? await supabase.from('entrevistas').update(campos).eq('id', e.id)
    : await supabase.from('entrevistas').insert({ id: crypto.randomUUID(), ...campos });
  return error ? 'não foi possível salvar (confira os campos)' : null;
}

export async function excluirEntrevista(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('entrevistas').delete().eq('id', id);
  return !error;
}

export function haTempo(data: string): string {
  const d = diasDesde(data);
  if (d === 0) return 'hoje';
  if (d === 1) return 'ontem';
  if (d < 14) return `há ${d} dias`;
  if (d < 60) return `há ${Math.floor(d / 7)} semanas`;
  if (d < 730) return `há ${Math.floor(d / 30)} meses`;
  return `há ${Math.floor(d / 365)} anos`;
}
