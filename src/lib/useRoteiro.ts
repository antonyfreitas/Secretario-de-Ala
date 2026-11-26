import { useEffect, useState } from 'react';
import type { ItemRoteiro } from '../dados/falas';
import { apagarRoteiro, carregarRoteiro, limparExpirados, salvarRoteiro } from './roteiro';

/** Apoios, desobrigações e boas-vindas do domingo (só neste aparelho). */
export function useRoteiro(uid: string | undefined, data: string) {
  const [itens, setItens] = useState<ItemRoteiro[]>([]);
  const [folhaSep, setFolhaSep] = useState(false);

  useEffect(() => { limparExpirados(); }, []);
  useEffect(() => {
    if (!data) return;
    const e = carregarRoteiro(uid, data);
    setItens(e.itens);
    setFolhaSep(!!e.folhaSeparada);
  }, [uid, data]);

  const gravar = (it: ItemRoteiro[] = itens, fs: boolean = folhaSep) => {
    setItens(it);
    setFolhaSep(fs);
    if (data) salvarRoteiro(uid, { versao: 1, data, itens: it, folhaSeparada: fs });
  };
  const apagar = () => {
    if (data) apagarRoteiro(uid, data);
    setItens([]);
    setFolhaSep(false);
  };
  return { itens, folhaSep, gravar, apagar };
}

export type EstadoDoRoteiro = ReturnType<typeof useRoteiro>;
