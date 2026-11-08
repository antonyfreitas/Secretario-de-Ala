import raw from '../dados/manual-pontos.txt?raw';
import { ymd } from './datas';
import { supabase } from './supabase';

export const MANUAL_URL = 'https://www.churchofjesuschrist.org/study/manual/general-handbook?lang=por';

export interface Ponto { n: string; t: string; nivel: number; cap: string }
export interface Estudo { ponto: string; prioridade: boolean; estudado_em: string | null; por_nome: string | null }

const linhas = raw.trim().split('\n').map((l) => {
  const i = l.indexOf('|');
  return { n: l.slice(0, i), t: l.slice(i + 1) };
});
export const CAPITULOS = new Map<string, string>(linhas.filter((l) => !l.n.includes('.')).map((l) => [l.n, l.t]));
export const PONTOS: Ponto[] = linhas.map((l) => ({ ...l, nivel: l.n.split('.').length, cap: l.n.split('.')[0] }));
export const POR_NUMERO = new Map(PONTOS.map((p) => [p.n, p]));

/** Pontos sorteáveis: seções e subseções; o capítulo inteiro só quando ainda não há seções cadastradas nele. */
const capsComSecoes = new Set(PONTOS.filter((p) => p.nivel > 1).map((p) => p.cap));
export const SORTEAVEIS: Ponto[] = PONTOS.filter((p) => (p.nivel > 1 ? true : !capsComSecoes.has(p.cap)));

/** Semana ISO (segunda a domingo) da data informada. */
export function semanaISO(d: Date) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const dia = (t.getDay() + 6) % 7;
  const inicio = new Date(t);
  inicio.setDate(t.getDate() - dia);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  const quinta = new Date(inicio);
  quinta.setDate(inicio.getDate() + 3);
  const ano = quinta.getFullYear();
  const jan4 = new Date(ano, 0, 4, 12);
  const sem = 1 + Math.round(((+quinta - +jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return { chave: `${ano}-W${String(sem).padStart(2, '0')}`, inicio: ymd(inicio), fim: ymd(fim) };
}

/** Sorteia um ponto ainda não estudado. Metade das vezes, entre os marcados como prioritários (se houver). */
export function sortear(estudos: Estudo[], excluir?: string): Ponto | undefined {
  const estudados = new Set(estudos.filter((e) => e.estudado_em).map((e) => e.ponto));
  const prior = new Set(estudos.filter((e) => e.prioridade).map((e) => e.ponto));
  let pool = SORTEAVEIS.filter((p) => !estudados.has(p.n) && p.n !== excluir);
  if (!pool.length) pool = SORTEAVEIS.filter((p) => p.n !== excluir);
  const pri = pool.filter((p) => prior.has(p.n));
  const alvo = pri.length && Math.random() < 0.5 ? pri : pool;
  return alvo[Math.floor(Math.random() * alvo.length)];
}

export async function listarEstudo(): Promise<Estudo[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('manual_estudo').select('ponto,prioridade,estudado_em,por_nome');
  return error ? null : ((data ?? []) as Estudo[]);
}

export async function gravarEstudo(atual: Estudo[], ponto: string, campos: { prioridade?: boolean; estudado_em?: string | null }): Promise<boolean> {
  if (!supabase) return false;
  const existe = atual.some((e) => e.ponto === ponto);
  const { error } = existe
    ? await supabase.from('manual_estudo').update(campos).eq('ponto', ponto)
    : await supabase.from('manual_estudo').insert({ ponto, ...campos });
  return !error;
}

export async function pontoDaSemana(semana: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('manual_semana').select('ponto').eq('semana', semana).maybeSingle();
  return (data?.ponto as string | undefined) ?? null;
}

export async function definirSemana(semana: string, ponto: string, existe: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = existe
    ? await supabase.from('manual_semana').update({ ponto }).eq('semana', semana)
    : await supabase.from('manual_semana').insert({ semana, ponto });
  return !error;
}
