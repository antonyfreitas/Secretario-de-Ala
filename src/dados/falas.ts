/**
 * Falas do roteiro. O nome e o chamado digitados viram a fala pronta para o bispado ler.
 * Marcas: [pausa] indica uma pequena pausa. Textos de apoio e desobrigação seguem o Manual Geral 30.3 e 30.6;
 * a fala de novo membro é uma sugestão (o Manual 29.2.1.1 descreve o procedimento, mas não traz o texto).
 */
export type Bloco = 'desobrigacao' | 'apoio' | 'novo_membro';

export interface ItemRoteiro {
  id: string;
  bloco: Bloco;
  nome: string;
  cargo: string;
  genero: 'm' | 'f';
  /** Dizer "da ala X" depois do chamado. Indefinido = decide sozinho pelo texto do chamado. */
  daAla?: boolean;
  tipo: 'batizado' | 'mudou';
}

export const BLOCOS: { id: Bloco; titulo: string; ordem: number; origem: string }[] = [
  { id: 'desobrigacao', titulo: 'Desobrigação', ordem: 1, origem: 'Manual 30.6' },
  { id: 'apoio', titulo: 'Apoio a chamado', ordem: 2, origem: 'texto da ala, a partir do Manual 30.3' },
  { id: 'novo_membro', titulo: 'Boas-vindas a novo membro', ordem: 3, origem: 'sugestão (o Manual 29.2.1.1 descreve o procedimento, sem texto pronto)' },
];

/** Se o chamado já diz a que unidade pertence ("da Escola Dominical", "da ala"), não acrescenta "da ala X". */
export const sugereDaAla = (cargo: string) => !/\b(da|do|de|das|dos|na|no)\b/i.test(cargo) && !/\bala\b/i.test(cargo);

export function chamadoCompleto(i: ItemRoteiro, ala: string): string {
  const cargo = i.cargo.trim();
  if (!cargo) return '[chamado]';
  const acrescenta = (i.daAla ?? sugereDaAla(cargo)) && ala.trim();
  return acrescenta ? `${cargo} da ala ${ala.trim()}` : cargo;
}

export function falaDe(i: ItemRoteiro, ala: string): string {
  const nome = i.nome.trim() || '[nome]';
  const f = i.genero === 'f';
  if (i.bloco === 'apoio') {
    return `É proposto que apoiemos ${nome} como ${chamadoCompleto(i, ala)}. Os que são a favor, manifestem-se levantando a mão. [pausa] Os que são contrários, pelo mesmo sinal. [pausa]`;
  }
  if (i.bloco === 'desobrigacao') {
    return `${nome} está sendo desobrigad${f ? 'a' : 'o'} como ${chamadoCompleto(i, ala)}. Os que desejarem manifestar agradecimento por seus serviços prestados podem fazê-lo levantando a mão.`;
  }
  const situacao = i.tipo === 'mudou' ? 'mudou-se para a nossa ala' : f ? 'foi batizada e confirmada recentemente' : 'foi batizado e confirmado recentemente';
  return `Hoje temos a alegria de dar as boas-vindas a ${nome}, que ${situacao}. Os que desejarem dar-lhe as boas-vindas, manifestem-se erguendo o braço.`;
}

export const novoItem = (bloco: Bloco): ItemRoteiro => ({ id: crypto.randomUUID(), bloco, nome: '', cargo: '', genero: 'f', tipo: 'batizado' });
