import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export interface Perfil { id: string; usuario: string; nome: string; role: 'admin' | 'aprovador' | 'user'; ativo: boolean }
interface Ctx {
  carregando: boolean;
  perfil: Perfil | null;
  nuvem: boolean;
  entrar: (usuario: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  recarregarNuvem: () => Promise<void>;
}

export const ROTULO_PAPEL: Record<string, string> = { admin: 'administrador', aprovador: 'aprovador (bispado)', user: 'usuário' };

const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('AuthProvider ausente');
  return c;
};

const OCIOSO_MS = 30 * 60 * 1000;
/** O login usa "usuário"; internamente vira um e-mail sintético, sem guardar e-mail de ninguém. */
const emailDe = (u: string) => `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@secretaria.local`;

async function buscarPerfil(): Promise<Perfil | null> {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from('profiles').select('id,usuario,nome,role,ativo').eq('id', u.user.id).maybeSingle();
  return data && data.ativo ? (data as Perfil) : null;
}
async function buscarNuvem(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('config').select('valor').eq('chave', 'nuvem_ativa').maybeSingle();
  return data?.valor === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nuvem, setNuvem] = useState(false);

  const sair = useCallback(async () => {
    setPerfil(null);
    setNuvem(false);
    await supabase?.auth.signOut();
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const p = await buscarPerfil();
          if (!vivo) return;
          if (p) {
            setPerfil(p);
            setNuvem(await buscarNuvem());
          } else {
            await supabase.auth.signOut();
          }
        }
      }
      if (vivo) setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // sai sozinho depois de 30 minutos sem uso
  useEffect(() => {
    if (!perfil) return;
    let t = window.setTimeout(sair, OCIOSO_MS);
    const reinicia = () => {
      window.clearTimeout(t);
      t = window.setTimeout(sair, OCIOSO_MS);
    };
    const eventos = ['pointerdown', 'keydown', 'visibilitychange'];
    eventos.forEach((e) => window.addEventListener(e, reinicia));
    return () => {
      window.clearTimeout(t);
      eventos.forEach((e) => window.removeEventListener(e, reinicia));
    };
  }, [perfil, sair]);

  const entrar = useCallback(async (usuario: string, senha: string) => {
    if (!supabase) return 'O servidor ainda não está configurado.';
    const { error } = await supabase.auth.signInWithPassword({ email: emailDe(usuario), password: senha });
    if (error) return 'Usuário ou senha inválidos.';
    const p = await buscarPerfil();
    if (!p) {
      await supabase.auth.signOut();
      return 'Este usuário não tem acesso ativo.';
    }
    setPerfil(p);
    setNuvem(await buscarNuvem());
    return null;
  }, []);

  const recarregarNuvem = useCallback(async () => setNuvem(await buscarNuvem()), []);

  return <AuthCtx.Provider value={{ carregando, perfil, nuvem, entrar, sair, recarregarNuvem }}>{children}</AuthCtx.Provider>;
}
