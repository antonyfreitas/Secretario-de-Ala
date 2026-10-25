export const p2 = (n: number) => String(n).padStart(2, '0');
export const ymd = (t: Date) => `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`;
export const fd = (s: string) => (s ? s.split('-').reverse().join('/') : '');
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesTxt = (m?: string) => (m ? `${MESES[+m.slice(5, 7) - 1]} de ${m.slice(0, 4)}` : '');
export function proxDomingo() {
  const t = new Date();
  t.setDate(t.getDate() + ((7 - t.getDay()) % 7));
  return ymd(t);
}
export const quando = (iso: string) => {
  const t = new Date(iso);
  return isNaN(+t) ? '' : `${p2(t.getDate())}/${p2(t.getMonth() + 1)}/${t.getFullYear()} ${p2(t.getHours())}:${p2(t.getMinutes())}`;
};
export const diasDesde = (k: string) => Math.max(0, Math.floor((Date.now() - +new Date(k + 'T12:00:00')) / 864e5));
export const soma = (k: string, dias: number) => {
  const t = new Date(k + 'T12:00:00');
  t.setDate(t.getDate() + dias);
  return ymd(t);
};
