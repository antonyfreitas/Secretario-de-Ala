import { useEffect, useState } from 'react';
import { diasDesde, mesTxt } from './datas';

export interface Auto { verificado: string; ultimoMes: string; mudouEm: string | null; textoMudouEm: string | null }
export interface EstadoManual { ultimoMes?: string; verificado?: string; lido?: boolean; nota?: string }

const isD = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const isM = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}$/.test(x);

export function useManual(uid: string | undefined) {
  const chave = `manual.v2:${uid ?? ''}`;
  const [auto, setAuto] = useState<Auto | null>(null);
  const [m, setM] = useState<EstadoManual>(() => {
    try {
      return JSON.parse(localStorage.getItem(chave) || '{}') as EstadoManual;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!uid) return;
    let vivo = true;
    fetch('/data/manual-status.json?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (vivo && j && isM(j.ultimoMes) && isD(j.verificado)) {
          setAuto({ verificado: j.verificado, ultimoMes: j.ultimoMes, mudouEm: isD(j.mudouEm) ? j.mudouEm : null, textoMudouEm: isD(j.textoMudouEm) ? j.textoMudouEm : null });
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [uid]);

  const salvar = (n: EstadoManual) => {
    setM(n);
    try {
      localStorage.setItem(chave, JSON.stringify(n));
    } catch {
      /* sem armazenamento */
    }
  };

  const dv = m.verificado ? diasDesde(m.verificado) : null;
  let texto: string;
  let naoLida: boolean;
  let alerta: boolean;
  if (auto) {
    const dm = diasDesde(auto.verificado);
    naoLida = auto.ultimoMes !== m.ultimoMes;
    alerta = naoLida || dm >= 14;
    texto = naoLida
      ? m.ultimoMes ? `Atualização nova: ${mesTxt(auto.ultimoMes)}. Toque para ler.` : `Monitor ativo. Última atualização: ${mesTxt(auto.ultimoMes)}. Toque para confirmar.`
      : dm >= 14 ? `O monitor não roda há ${dm} dias. Confira o workflow no GitHub.`
      : `Sem novidades. Última atualização: ${mesTxt(auto.ultimoMes)}. Monitor verificou há ${dm} ${dm === 1 ? 'dia' : 'dias'}.`;
  } else {
    const atrasada = dv === null || dv >= 30;
    naoLida = m.lido === false;
    alerta = atrasada || naoLida;
    texto = !m.verificado ? 'Ainda não verificado. Abra e registre a primeira verificação.'
      : naoLida ? `Atualização nova para ler: ${mesTxt(m.ultimoMes)}.`
      : `Última atualização vista: ${mesTxt(m.ultimoMes)}. Verificado há ${dv} ${dv === 1 ? 'dia' : 'dias'}${atrasada ? '. Hora de verificar de novo.' : '.'}`;
  }
  return { auto, m, salvar, texto, naoLida, alerta };
}
