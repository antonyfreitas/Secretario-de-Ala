import { BLOCOS, type ItemRoteiro } from '../dados/falas';
import { PROGRAMA } from '../dados/roteiro';
import { ymd } from './datas';

/**
 * O roteiro de cada domingo fica SÓ neste aparelho (localStorage), por usuário e por data, e é apagado
 * depois do domingo. Nada daqui vai para o servidor: o Manual 30.6 pede sigilo sobre chamados e
 * desobrigações até o anúncio.
 */
export interface EstadoRoteiro { versao: 1; data: string; liga: Record<string, boolean>; itens: ItemRoteiro[]; folhaSeparada?: boolean }

const PREFIXO = 'roteiro:';
const chave = (uid: string | undefined, data: string) => `${PREFIXO}${uid ?? 'visitante'}:${data}`;

export function padraoLiga(): Record<string, boolean> {
  return Object.fromEntries(PROGRAMA.map((i) => [i.id, i.padrao]));
}

export function carregarRoteiro(uid: string | undefined, data: string): EstadoRoteiro {
  const base: EstadoRoteiro = { versao: 1, data, liga: padraoLiga(), itens: [] };
  try {
    const bruto = localStorage.getItem(chave(uid, data));
    if (!bruto) return base;
    const salvo = JSON.parse(bruto) as Partial<EstadoRoteiro>;
    const liga = { ...base.liga };
    for (const i of PROGRAMA) {
      if (typeof salvo.liga?.[i.id] === 'boolean') liga[i.id] = salvo.liga[i.id];
      if (i.fixo) liga[i.id] = true;
    }
    const validos = new Set<string>(BLOCOS.map((b) => b.id));
    const itens = Array.isArray(salvo.itens) ? salvo.itens.filter((i) => i && validos.has(i.bloco) && typeof i.id === 'string') : [];
    return { versao: 1, data, liga, itens, folhaSeparada: !!salvo.folhaSeparada };
  } catch {
    return base;
  }
}

export function salvarRoteiro(uid: string | undefined, e: EstadoRoteiro): void {
  try {
    localStorage.setItem(chave(uid, e.data), JSON.stringify(e));
  } catch {
    /* sem armazenamento: o roteiro vale só nesta tela */
  }
}

export function apagarRoteiro(uid: string | undefined, data: string): void {
  try {
    localStorage.removeItem(chave(uid, data));
  } catch {
    /* sem armazenamento */
  }
}

/** Apaga os roteiros de domingos que já passaram (a data do domingo + 1 dia). */
export function limparExpirados(hoje = new Date()): number {
  let removidos = 0;
  try {
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 12);
    const limite = ymd(ontem);
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIXO)) continue;
      const data = k.slice(k.lastIndexOf(':') + 1);
      if (/^\d{4}-\d{2}-\d{2}$/.test(data) && data < limite) {
        localStorage.removeItem(k);
        removidos++;
      }
    }
  } catch {
    /* sem armazenamento */
  }
  return removidos;
}
