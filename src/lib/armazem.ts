import { useCallback, useState } from 'react';
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

export function useAtas(uid: string | undefined) {
  const [atas, setAtas] = useState<Ata[]>(() => (uid ? carregar(uid) : []));
  const salvar = useCallback(
    (a: Ata[]) => {
      if (!uid) return false;
      const ok = gravar(uid, a);
      if (ok) setAtas(a);
      return ok;
    },
    [uid],
  );
  return { atas, salvar };
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
