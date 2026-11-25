/** Aviso exibido no rodapé e na página Sobre. */
export const AVISO = 'Esta ferramenta é independente e não é um produto oficial nem patrocinado pela Igreja.';

export interface Administrador { nome: string; contato: string }

/**
 * Administradores do site, com contato visível na página Sobre (mais de um, como o Manual pede).
 * Preencha antes de publicar, por exemplo: { nome: 'Fulano', contato: 'fulano@exemplo.com.br' }.
 */
export const ADMINISTRADORES: Administrador[] = [];
