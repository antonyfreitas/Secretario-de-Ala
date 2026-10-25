import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = Boolean(url && key);

/** A chave publishable é pública por desenho. Quem protege os dados são as políticas RLS no banco. */
export const supabase = configurado
  ? createClient(url as string, key as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'secretaria-auth' },
    })
  : null;

/** Nomes (sem valores) das variáveis que não chegaram no build; ajuda a diagnosticar o deploy. */
export const faltando = [!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean) as string[];
