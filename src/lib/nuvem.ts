import { supabase } from './supabase';
import { limpar, type Ata } from './tipos';

export type Resultado = 'ok' | 'conflito' | 'erro';

export async function listarAtas(): Promise<Ata[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('atas_ala').select('id,d,criado_em,atualizado_em').order('data', { ascending: false });
  if (error) return null;
  return (data ?? []).map((r) => ({
    v: 1 as const,
    id: r.id as string,
    criado: r.criado_em as string,
    atualizado: r.atualizado_em as string,
    d: limpar(r.d),
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
