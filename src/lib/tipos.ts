export interface Dados {
  ala: string; data: string; freq: string; presidida: string; dirigida: string; regente: string; pianista: string;
  boasvindas: string; anuncios: string; hinoAbertura: string; oracaoAbertura: string; assuntos: string;
  hinoSacramental: string; orador1: string; orador2: string; hinoInter: string; orador3: string;
  ultimoHino: string; ultimaOracao: string;
  incluirOr: boolean; semAssuntos: boolean; pronta: boolean;
}
export type ChaveTexto = Exclude<keyof Dados, 'incluirOr' | 'semAssuntos' | 'pronta'>;
export interface Ata { v: 1; id: string; criado: string; atualizado: string; d: Dados }

export const CHAVES: ChaveTexto[] = [
  'ala', 'data', 'freq', 'presidida', 'dirigida', 'regente', 'pianista', 'boasvindas', 'anuncios',
  'hinoAbertura', 'oracaoAbertura', 'assuntos', 'hinoSacramental', 'orador1', 'orador2', 'hinoInter',
  'orador3', 'ultimoHino', 'ultimaOracao',
];
export const CAMPOS_PROGRESSO: ChaveTexto[] = [
  'presidida', 'dirigida', 'regente', 'pianista', 'boasvindas', 'hinoAbertura', 'oracaoAbertura',
  'hinoSacramental', 'orador1', 'orador2', 'hinoInter', 'orador3', 'ultimoHino', 'ultimaOracao',
];

export function vazio(data = ''): Dados {
  const d = { incluirOr: true, semAssuntos: false, pronta: false } as Dados;
  for (const k of CHAVES) d[k] = '';
  d.ala = 'Ipanema';
  d.data = data;
  return d;
}

/** Aceita só os campos conhecidos, como texto limitado (usado em importações e restaurações). */
export function limpar(x: unknown): Dados {
  const o = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
  const d = vazio();
  for (const k of CHAVES) d[k] = String(o[k] ?? '').slice(0, 5000);
  d.incluirOr = o.incluirOr !== false;
  d.semAssuntos = !!o.semAssuntos;
  d.pronta = !!o.pronta;
  return d;
}
