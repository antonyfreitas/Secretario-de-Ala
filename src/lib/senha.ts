const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Senha aleatória no formato xxxxx-xxxxx-xxxxx-xxxxx (cerca de 114 bits), sem letras ambíguas. */
export function gerarSenha(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const letras = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]);
  return [0, 5, 10, 15].map((i) => letras.slice(i, i + 5).join('')).join('-');
}
