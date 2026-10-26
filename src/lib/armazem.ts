import { useCallback, useEffect, useState } from 'react';
import { excluirAta, gravarAta, listarAtas } from './nuvem';
import { limpar, type Ata } from './tipos';

const chave = (uid: string) => `atas.v2:${uid}`;
export const novoId = () => crypto.randomUUID();

export function carregar(uid: string): Ata[] {
  try {
    const a = JSON.parse(localStorage.getItem(chave(uid)) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
export function gravar(uid: string, a: Ata[]): boolean {
  try {
    localStorage.setItem(chave(uid), JSON.stringify(a));
    return true;
  } catch {
    return false;
  }
}
export function apagarTudo(uid: string) {
  try {
    localStorage.removeItem(chave(uid));
  } catch {
    /* sem armazenamento */
  }
}

export function useAtas(uid: string | undefined, nuvem = false) {
  const [atas, setAtas] = useState<Ata[]>(() => (uid && !nuvem ? carregar(uid) : []));
  const [carregando, setCarregando] = useState(nuvem);

  useEffect(() => {
    if (!uid) return;
    if (!nuvem) {
      setAtas(carregar(uid));
      setCarregando(false);
      return;
    }
    let vivo = true;
    setCarregando(true);
    void listarAtas().then((l) => {
      if (!vivo) return;
      if (l) setAtas(l);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [uid, nuvem]);

  const salvar = useCallback(
    async (nova: Ata[]): Promise<boolean> => {
      if (!uid) return false;
      if (!nuvem) {
        const ok = gravar(uid, nova);
        if (ok) setAtas(nova);
        return ok;
      }
      const antigo = new Map(atas.map((a) => [a.id, a]));
      let ok = true;
      for (const a of nova) {
        const o = antigo.get(a.id);
        if (!o || JSON.stringify(o.d) !== JSON.stringify(a.d)) {
          if ((await gravarAta(a, o?.atualizado)) !== 'ok') ok = false;
        }
      }
      for (const o of atas) {
        if (!nova.some((a) => a.id === o.id) && !(await excluirAta(o.id))) ok = false;
      }
      const l = await listarAtas();
      if (l) setAtas(l);
      return ok;
    },
    [uid, nuvem, atas],
  );
  const recarregar = useCallback(async () => {
    const l = await listarAtas();
    if (l) setAtas(l);
  }, []);
  return { atas, salvar, carregando, recarregar };
}

/** Junta atas vindas de arquivo ou da nuvem: mantém a mais recente de cada id. */
export function mesclar(atual: Ata[], vindas: unknown[]) {
  const a = [...atual];
  let add = 0;
  let upd = 0;
  for (const x of vindas) {
    if (typeof x !== 'object' || x === null) continue;
    const o = x as Record<string, unknown>;
    if (typeof o.d !== 'object' || o.d === null) continue;
    const id = String(o.id ?? '').replace(/[^a-zA-Z0-9-]/g, '') || novoId();
    const at = String(o.atualizado ?? new Date().toISOString());
    const d = limpar(o.d);
    const i = a.findIndex((y) => y.id === id);
    if (i >= 0) {
      if (at > a[i].atualizado) {
        a[i] = { ...a[i], d, atualizado: at };
        upd++;
      }
    } else {
      a.push({ v: 1, id, criado: String(o.criado ?? at), atualizado: at, d });
      add++;
    }
  }
  return { a, add, upd };
}
