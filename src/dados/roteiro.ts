/**
 * Programa da reunião sacramental: os 12 itens que o Manual Geral (29.2.1.1) diz que a reunião "pode incluir".
 * Os títulos são resumos próprios; o texto oficial está no Manual.
 */
export interface ItemPrograma {
  id: string;
  n: number;
  titulo: string;
  /** Título no domingo de jejum e testemunhos (29.2.2), quando muda. */
  tituloTestemunhos?: string;
  ref: string;
  padrao: boolean;
  /** Não pode ser desligado. */
  fixo?: boolean;
  nota?: string;
}

export const PROGRAMA: ItemPrograma[] = [
  { id: 'preludio', n: 1, titulo: 'Prelúdio musical', ref: '29.2.1.1', padrao: true },
  { id: 'boas_vindas', n: 2, titulo: 'Saudações e boas-vindas', ref: '29.2.1.1', padrao: true },
  { id: 'reconhecimento', n: 3, titulo: 'Reconhecimento do líder presidente e de líderes visitantes', ref: '29.2.1.1', padrao: true },
  { id: 'anuncios', n: 4, titulo: 'Anúncios', ref: '29.2.1.1', padrao: true },
  { id: 'abertura', n: 5, titulo: 'Hino e oração de abertura', ref: '29.2.1.1', padrao: true },
  { id: 'assuntos', n: 6, titulo: 'Assuntos da ala e da estaca', ref: '29.2.1.1; 30.3; 30.6', padrao: true, nota: 'Apoio, desobrigação e novos membros: veja as falas abaixo.' },
  { id: 'criancas', n: 7, titulo: 'Abençoar e dar nome a crianças', ref: '29.2.1.1', padrao: false, nota: 'Em geral, no domingo de jejum e testemunhos.' },
  { id: 'confirmacao', n: 8, titulo: 'Confirmação de novos conversos', ref: '29.2.1.1', padrao: false },
  { id: 'sacramento', n: 9, titulo: 'Hino sacramental e distribuição do sacramento', ref: '29.2.1.1', padrao: true, fixo: true },
  { id: 'mensagens', n: 10, titulo: 'Mensagens do evangelho, hino da congregação ou outra música', tituloTestemunhos: 'Testemunhos dos membros (no lugar das mensagens)', ref: '29.2.1.1; 29.2.2', padrao: true, fixo: true },
  { id: 'encerramento', n: 11, titulo: 'Hino e oração de encerramento', ref: '29.2.1.1', padrao: true },
  { id: 'posludio', n: 12, titulo: 'Poslúdio musical', ref: '29.2.1.1', padrao: true },
];
