import { useEffect, useState } from 'react';
import type { ItemRoteiro } from '../dados/falas';
import { apagarRoteiro, carregarRoteiro, limparExpirados, padraoLiga, salvarRoteiro } from './roteiro';

/** Estado do roteiro do domingo (só neste aparelho), compartilhado pelo painel dos 12 itens e pela seção de assuntos. */
export function useRoteiro(uid: string | undefined, data: string) {
  const [liga, setLiga] = useState<Record<string, boolean>>(padraoLiga);
  const [itens, setItens] = useState<ItemRoteiro[]>([]);
  const [folhaSep, setFolhaSep] = useState(false);

  useEffect(() => { limparExpirados(); }, []);
  useEffect(() => {
    if (!data) return;
    const e = carregarRoteiro(uid, data);
    setLiga(e.liga);
    setItens(e.itens);
    setFolhaSep(!!e.folhaSeparada);
  }, [uid, data]);

  const gravar = (l: Record<string, boolean> = liga, it: ItemRoteiro[] = itens, fs: boolean = folhaSep) => {
    setLiga(l);
    setItens(it);
    setFolhaSep(fs);
    if (data) salvarRoteiro(uid, { versao: 1, data, liga: l, itens: it, folhaSeparada: fs });
  };
  const apagar = () => {
    if (data) apagarRoteiro(uid, data);
    setLiga(padraoLiga());
    setItens([]);
    setFolhaSep(false);
  };
  return { liga, itens, folhaSep, gravar, apagar };
}

export type EstadoDoRoteiro = ReturnType<typeof useRoteiro>;
