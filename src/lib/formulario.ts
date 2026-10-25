import type { Dados } from './tipos';

export type Tipo = 'text' | 'time' | 'date' | 'number' | 'area' | 'hino' | 'check';
export interface Campo { id: keyof Dados; rotulo: string; tipo?: Tipo; dica?: string; larga?: boolean; soLogado?: boolean }

export const SECOES: [string, Campo[]][] = [
  ['Informações', [
    { id: 'ala', rotulo: 'Ala' }, { id: 'data', rotulo: 'Data', tipo: 'date' }, { id: 'freq', rotulo: 'Frequência', tipo: 'number' },
    { id: 'presidida', rotulo: 'Presidida' }, { id: 'dirigida', rotulo: 'Dirigida' }, { id: 'regente', rotulo: 'Regente' }, { id: 'pianista', rotulo: 'Pianista' },
  ]],
  ['Abertura', [
    { id: 'boasvindas', rotulo: 'Boas-vindas e reconhecimento de autoridades e líderes', larga: true },
    { id: 'anuncios', rotulo: 'Anúncios', tipo: 'area', dica: 'Um por linha', larga: true },
    { id: 'hinoAbertura', rotulo: 'Hino de abertura', tipo: 'hino' }, { id: 'oracaoAbertura', rotulo: 'Oração de abertura' },
  ]],
  ['Assuntos da ala e da estaca', [
    { id: 'assuntos', rotulo: 'Apoios, desobrigações e outros assuntos', tipo: 'area', dica: 'Um por linha. Ex.: APOIAR: nome - chamado', larga: true },
    { id: 'semAssuntos', rotulo: 'Não guardar este campo ao salvar', tipo: 'check', soLogado: true },
  ]],
  ['Sacramento', [
    { id: 'hinoSacramental', rotulo: 'Hino sacramental', tipo: 'hino' },
    { id: 'incluirOr', rotulo: 'Incluir no PDF as orações do pão e da água', tipo: 'check' },
  ]],
  ['Mensagens do evangelho', [
    { id: 'orador1', rotulo: 'Primeiro orador' }, { id: 'orador2', rotulo: 'Segundo orador' },
    { id: 'hinoInter', rotulo: 'Hino intermediário', tipo: 'hino' }, { id: 'orador3', rotulo: 'Último orador' },
  ]],
  ['Encerramento', [{ id: 'ultimoHino', rotulo: 'Último hino', tipo: 'hino' }, { id: 'ultimaOracao', rotulo: 'Última oração' }]],
  ['Situação', [{ id: 'pronta', rotulo: 'Marcar esta ata como pronta (aparece como “Pronta” no calendário)', tipo: 'check', soLogado: true }]],
];
