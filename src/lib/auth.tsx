import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export interface Perfil { id: string; usuario: string; nome: string; role: 'admin' | 'org_admin' | 'user'; ativo: boolean; org_id: string | null; trocar_senha: boolean }
export interface OrgAtual { id: string; nome: string; nuvem: boolean; entrevistas: boolean }
interface Ctx {
  carregando: boolean;
  perfil: Perfil | null;
  org: OrgAtual | null;
  nuvem: boolean;
  entrar: (usuario: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  recarregarNuvem: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
}

export const ROTULO_PAPEL: Record<string, string> = { admin: 'administrador geral', org_admin: 'administrador da ala', user: 'usuário' };

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
  const { data } = await supabase.from('profiles').select('id,usuario,nome,role,ativo,org_id,trocar_senha').eq('id', u.user.id).maybeSingle();
  return data && data.ativo ? (data as Perfil) : null;
}
async function buscarOrg(p: Perfil | null): Promise<OrgAtual | null> {
  if (!supabase || !p?.org_id) return null;
  const { data } = await supabase.from('organizacoes').select('id,nome,nuvem_ativa,entrevistas_ativo').eq('id', p.org_id).maybeSingle();
  return data ? { id: data.id as string, nome: data.nome as string, nuvem: data.nuvem_ativa === true, entrevistas: data.entrevistas_ativo === true } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [org, setOrg] = useState<OrgAtual | null>(null);

  const sair = useCallback(async () => {
    setPerfil(null);
    setOrg(null);
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
            setOrg(await buscarOrg(p));
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
    setOrg(await buscarOrg(p));
    return null;
  }, []);

  const recarregarNuvem = useCallback(async () => setOrg(await buscarOrg(perfil)), [perfil]);
  const recarregarPerfil = useCallback(async () => {
    const p = await buscarPerfil();
    if (p) setPerfil(p);
  }, []);

  return <AuthCtx.Provider value={{ carregando, perfil, org, nuvem: org?.nuvem ?? false, entrar, sair, recarregarNuvem, recarregarPerfil }}>{children}</AuthCtx.Provider>;
}
