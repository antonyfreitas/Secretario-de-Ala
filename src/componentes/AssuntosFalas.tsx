import { Fragment } from 'react';
import { BLOCOS, chamadoCompleto, falaDe, novoItem, sugereDaAla, type Bloco, type ItemRoteiro } from '../dados/falas';
import type { EstadoDoRoteiro } from '../lib/useRoteiro';

interface Props { data: string; ala: string; r: EstadoDoRoteiro }

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

/** Dentro de "Assuntos da ala e da estaca": apoio, desobrigação e boas-vindas, com a fala pronta ao digitar nome e chamado. */
export default function AssuntosFalas({ data, ala, r }: Props) {
  const { liga, itens, gravar } = r;
  const atualizar = (id: string, mudanca: Partial<ItemRoteiro>) => gravar(liga, itens.map((i) => (i.id === id ? { ...i, ...mudanca } : i)));
  const ordenados = [...itens].sort((a, b) => BLOCOS.findIndex((x) => x.id === a.bloco) - BLOCOS.findIndex((x) => x.id === b.bloco));

  return (
    <div className="assuntos-falas">
      <h3 className="sub-titulo">Apoios, desobrigações e boas-vindas</h3>
      {!data ? (
        <p className="mut">Escolha a data da ata (em Informações) para adicionar apoios, desobrigações e boas-vindas deste domingo.</p>
      ) : !liga.assuntos ? (
        <p className="mut">O item 6 (Assuntos da ala e da estaca) está desligado no roteiro. <button className="lnk2" type="button" onClick={() => gravar({ ...liga, assuntos: true })}>Ligar</button></p>
      ) : (
        <>
          <p className="sub">Toque para adicionar. Ao digitar o nome e o chamado, a fala aparece pronta para ler e vai para o PDF. Os nomes ficam só neste aparelho.</p>
          <div className="acts">
            {BLOCOS.map((b) => <button key={b.id} className="btn peq" type="button" onClick={() => gravar(liga, [...itens, novoItem(b.id as Bloco)])}>+ {b.titulo}</button>)}
          </div>
          {ordenados.length === 0 && <p className="mut">Nada adicionado para este domingo. Ordem automática no PDF: desobrigação, apoio, boas-vindas.</p>}
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
          <p className="sub">O campo de texto abaixo é salvo junto com a ata. Não escreva nele chamados nem desobrigações antes da reunião: use os botões acima.</p>
        </>
      )}
    </div>
  );
}
