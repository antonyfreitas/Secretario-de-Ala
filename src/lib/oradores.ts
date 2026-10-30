import { fd, soma } from './datas';
import { norm } from './entrevistas';
import type { Ata } from './tipos';

export interface Discurso { data: string; ataId: string; posicao: number }
export interface Orador { chave: string; nome: string; discursos: Discurso[] }
export type Indice = Map<string, Orador>;
export type Tom = 'novo' | 'recente' | 'normal' | 'longo';
export interface Resumo { anterior?: Discurso; proximo?: Discurso; total12: number; dias?: number; tom: Tom }

export const POSICAO = ['', 'Primeiro orador', 'Segundo orador', 'Último orador'];

/** Monta o histórico de discursos a partir das atas (nada novo é guardado: é tudo derivado delas). */
export function indexarOradores(atas: Ata[], orgId?: string): Indice {
  const m: Indice = new Map();
  const ordenadas = [...atas].sort((a, b) => b.d.data.localeCompare(a.d.data));
  for (const a of ordenadas) {
    if (!a.d.data || (orgId && a.orgId && a.orgId !== orgId)) continue;
    [a.d.orador1, a.d.orador2, a.d.orador3].forEach((nome, i) => {
      const n = nome.trim();
      if (n.length < 2) return;
      const k = norm(n);
      const o = m.get(k) ?? { chave: k, nome: n, discursos: [] };
      o.discursos.push({ data: a.d.data, ataId: a.id, posicao: i + 1 });
      m.set(k, o);
    });
  }
  return m;
}

export const diasEntre = (a: string, b: string) => Math.round((+new Date(b + 'T12:00:00') - +new Date(a + 'T12:00:00')) / 864e5);

export function haDias(d: number): string {
  if (d <= 0) return 'no mesmo dia';
  if (d === 1) return 'há 1 dia';
  if (d < 14) return `há ${d} dias`;
  if (d < 60) return `há ${Math.floor(d / 7)} semanas`;
  if (d < 730) return `há ${Math.floor(d / 30)} meses`;
  return `há ${Math.floor(d / 365)} anos`;
}

/** Último discurso ANTES da data da ata, próximo já escalado DEPOIS dela, e quantos nos 12 meses anteriores. */
export function resumir(o: Orador | undefined, dataAta: string, ataId: string | null): Resumo {
  const outros = (o?.discursos ?? []).filter((d) => d.ataId !== ataId);
  const antes = dataAta ? outros.filter((d) => d.data < dataAta) : outros;
  const depois = dataAta ? outros.filter((d) => d.data > dataAta) : [];
  const anterior = antes[0];
  const proximo = depois.length ? depois[depois.length - 1] : undefined;
  const limite = dataAta ? soma(dataAta, -365) : '';
  const total12 = antes.filter((d) => d.data >= limite).length;
  const dias = anterior && dataAta ? diasEntre(anterior.data, dataAta) : undefined;
  const tom: Tom = !anterior ? 'novo' : dias === undefined ? 'normal' : dias < 60 ? 'recente' : dias > 180 ? 'longo' : 'normal';
  return { anterior, proximo, total12, dias, tom };
}

export const textoResumo = (r: Resumo): string => {
  const prox = r.proximo ? ` · Também escalado em ${fd(r.proximo.data)}` : '';
  if (!r.anterior) return `Sem discurso registrado antes desta data${prox}`;
  const quando = `${fd(r.anterior.data)}${r.dias !== undefined ? ` (${haDias(r.dias)})` : ''}`;
  const t12 = r.total12 ? ` · ${r.total12} ${r.total12 === 1 ? 'discurso' : 'discursos'} nos 12 meses anteriores` : '';
  const pre = r.tom === 'longo' ? 'Faz tempo: último discurso em ' : r.tom === 'recente' ? 'Falou há pouco: último discurso em ' : 'Último discurso em ';
  return `${pre}${quando}${t12}${prox}`;
};
