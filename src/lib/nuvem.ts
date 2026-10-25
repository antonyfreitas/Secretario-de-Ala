import { supabase } from './supabase';
import type { Ata } from './tipos';

export async function enviarBackup(atas: Ata[]): Promise<string | null> {
  if (!supabase) return 'Servidor não configurado.';
  const { error } = await supabase.from('backups').insert({ dados: { app: 'secretaria-ala', v: 2, atas } });
  if (error) return 'Não foi possível enviar o backup.';
  const { data } = await supabase.from('backups').select('id').order('criado_em', { ascending: false });
  const extras = (data ?? []).slice(10).map((b) => b.id as string);
  if (extras.length) await supabase.from('backups').delete().in('id', extras);
  return null;
}

export async function ultimoBackup(): Promise<{ criado: string; atas: unknown[] } | null | 'erro'> {
  if (!supabase) return 'erro';
  const { data, error } = await supabase
    .from('backups')
    .select('dados,criado_em')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return 'erro';
  if (!data) return null;
  const a = (data.dados as { atas?: unknown[] }).atas;
  return { criado: data.criado_em as string, atas: Array.isArray(a) ? a : [] };
}
