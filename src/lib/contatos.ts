import { supabase } from './supabase';

export interface Contato { id: string; nome: string; contato: string }

/** Contatos dos administradores do site (públicos, exibidos na página Sobre). */
export async function listarContatos(): Promise<Contato[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('contatos_site').select('id,nome,contato').order('ordem').order('criado_em');
  return error ? null : ((data ?? []) as Contato[]);
}

export async function adicionarContato(nome: string, contato: string, ordem: number): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('contatos_site').insert({ nome: nome.trim(), contato: contato.trim(), ordem });
  return !error;
}

export async function removerContato(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('contatos_site').delete().eq('id', id);
  return !error;
}
