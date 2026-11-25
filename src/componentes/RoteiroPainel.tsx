import { Fragment, useEffect, useState } from 'react';
import { BLOCOS, chamadoCompleto, falaDe, novoItem, sugereDaAla, type Bloco, type ItemRoteiro } from '../dados/falas';
import { PROGRAMA } from '../dados/roteiro';
import { fd } from '../lib/datas';
import { apagarRoteiro, carregarRoteiro, limparExpirados, padraoLiga, salvarRoteiro } from '../lib/roteiro';

interface Props { uid?: string; data: string; testemunhos: boolean; ala: string }

/** Texto da fala com as pausas destacadas. */
function Fala({ texto }: { texto: string }) {
  return (
    <p className="fala">
      {texto.split('[pausa]').map((parte, k, todas) => (
        <Fragment key={k}>{parte}{k < todas.length - 1 && <em className="pausa">pausa</em>}</Fragment>
      ))}
    </p>
  );
}

/** Roteiro da reunião: itens do programa e as falas de apoio, desobrigação e novo membro. Guardado só neste aparelho. */
export default function RoteiroPainel({ uid, data, testemunhos, ala }: Props) {
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

  const gravar = (l: Record<string, boolean>, it: ItemRoteiro[], fs = folhaSep) => {
    setLiga(l);
    setItens(it);
    setFolhaSep(fs);
    if (data) salvarRoteiro(uid, { versao: 1, data, liga: l, itens: it, folhaSeparada: fs });
  };
  const atualizar = (id: string, mudanca: Partial<ItemRoteiro>) => gravar(liga, itens.map((i) => (i.id === id ? { ...i, ...mudanca } : i)));
  const ligados = PROGRAMA.filter((i) => liga[i.id]).length;
  const ordenados = [...itens].sort((a, b) => BLOCOS.findIndex((x) => x.id === a.bloco) - BLOCOS.findIndex((x) => x.id === b.bloco));

  return (
    <details className="card">
      <summary><b>Roteiro da reunião</b> <span className="sub">{data ? `${ligados} de ${PROGRAMA.length} itens` : 'defina a data da ata'}</span></summary>
      {!data ? (
        <p className="mut">Escolha a data da ata para montar o roteiro daquele domingo.</p>
      ) : (
        <>
          <p className="sub">Domingo {fd(data)}. O roteiro fica só neste aparelho e é apagado depois do domingo. Nada vai para o servidor.</p>
          {testemunhos && <p className="dica dica-recente">Jejum e testemunhos: os testemunhos ficam no lugar das mensagens (Manual 29.2.2).</p>}
          {PROGRAMA.map((i) => {
            const on = !!liga[i.id];
            return (
              <div className="ln" key={i.id}>
                <div><b className="num">{i.n}</b> {testemunhos && i.tituloTestemunhos ? i.tituloTestemunhos : i.titulo}{i.nota ? <span> · {i.nota}</span> : null}</div>
                <button className={'btn sw' + (on ? ' on2' : '')} type="button" aria-pressed={on} disabled={i.fixo} onClick={() => gravar({ ...liga, [i.id]: !on }, itens)}>{i.fixo ? 'Sempre' : on ? 'Ligado' : 'Desligado'}</button>
              </div>
            );
          })}

          {liga.assuntos && (
            <div>
              <h3 className="sub-titulo">Assuntos da ala: falas</h3>
              <p className="sub">Preencha o nome e o chamado e a fala aparece pronta. Ordem automática: desobrigação, apoio, boas-vindas.</p>
              <div className="acts">
                {BLOCOS.map((b) => <button key={b.id} className="btn sw" type="button" onClick={() => gravar(liga, [...itens, novoItem(b.id as Bloco)])}>+ {b.titulo}</button>)}
              </div>
              {ordenados.map((i) => {
                const b = BLOCOS.find((x) => x.id === i.bloco)!;
                const idn = `r-${i.id}`;
                return (
                  <div className="bloco" key={i.id}>
                    <div className="secao"><b>{b.titulo}</b><button className="btn sw perigo" type="button" onClick={() => gravar(liga, itens.filter((x) => x.id !== i.id))}>Remover</button></div>
                    <div className="col">
                      <div><label htmlFor={`${idn}-n`}>Nome completo</label><input id={`${idn}-n`} type="text" autoComplete="off" autoCorrect="off" value={i.nome} onChange={(e) => atualizar(i.id, { nome: e.target.value })} /></div>
                      {i.bloco !== 'novo_membro' && (
                        <>
                          <div><label htmlFor={`${idn}-c`}>Chamado (ex.: secretário, professora da Escola Dominical)</label><input id={`${idn}-c`} type="text" autoComplete="off" autoCorrect="off" value={i.cargo} onChange={(e) => atualizar(i.id, { cargo: e.target.value })} /></div>
                          <label className="chk"><input type="checkbox" checked={i.daAla ?? sugereDaAla(i.cargo)} onChange={(e) => atualizar(i.id, { daAla: e.target.checked })} /> Dizer "da ala {ala || '…'}" depois do chamado</label>
                        </>
                      )}
                      {i.bloco !== 'apoio' && (
                        <div className="seg" role="group" aria-label="Irmão ou irmã">
                          <button type="button" className={i.genero === 'm' ? 'on3' : ''} onClick={() => atualizar(i.id, { genero: 'm' })}>Irmão</button>
                          <button type="button" className={i.genero === 'f' ? 'on3' : ''} onClick={() => atualizar(i.id, { genero: 'f' })}>Irmã</button>
                        </div>
                      )}
                      {i.bloco === 'novo_membro' && (
                        <div className="seg" role="group" aria-label="Situação">
                          <button type="button" className={i.tipo === 'batizado' ? 'on3' : ''} onClick={() => atualizar(i.id, { tipo: 'batizado' })}>Batizado(a)</button>
                          <button type="button" className={i.tipo === 'mudou' ? 'on3' : ''} onClick={() => atualizar(i.id, { tipo: 'mudou' })}>Mudou-se para a ala</button>
                        </div>
                      )}
                    </div>
                    <Fala texto={falaDe(i, ala)} />
                    <p className="sub">Origem: {b.origem}.{i.bloco !== 'novo_membro' && i.cargo.trim() ? ` Dirá: "${chamadoCompleto(i, ala)}".` : ''}</p>
                  </div>
                );
              })}
            </div>
          )}

          <label className="chk"><input type="checkbox" checked={folhaSep} onChange={(e) => gravar(liga, itens, e.target.checked)} /> Sempre imprimir as falas em folha separada (letra grande)</label>
          <p className="sub">No PDF, as falas entram na ata quando cabem em letra legível; se não couberem, vão para a Folha de falas (página 2). Só saem os blocos com nome{' '}e chamado preenchidos.</p>
          <div className="acts">
            <button className="btn peq" type="button" onClick={() => gravar(padraoLiga(), itens)}>Restaurar padrão</button>
            <button className="btn peq" type="button" onClick={() => { apagarRoteiro(uid, data); setLiga(padraoLiga()); setItens([]); setFolhaSep(false); }}>Apagar deste aparelho</button>
          </div>
        </>
      )}
    </details>
  );
}
