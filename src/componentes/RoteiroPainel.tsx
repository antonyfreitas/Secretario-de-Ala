import { PROGRAMA } from '../dados/roteiro';
import { fd } from '../lib/datas';
import { padraoLiga } from '../lib/roteiro';
import type { EstadoDoRoteiro } from '../lib/useRoteiro';

interface Props { data: string; testemunhos: boolean; r: EstadoDoRoteiro }

/** Roteiro da reunião: quais dos 12 itens do programa entram neste domingo. Guardado só neste aparelho. */
export default function RoteiroPainel({ data, testemunhos, r }: Props) {
  const { liga, itens, folhaSep, gravar, apagar } = r;
  const ligados = PROGRAMA.filter((i) => liga[i.id]).length;

  return (
    <details className="card">
      <summary><b>Roteiro da reunião</b> <span className="sub">{data ? `${ligados} de ${PROGRAMA.length} itens` : 'defina a data da ata'}</span></summary>
      {!data ? (
        <p className="mut">Escolha a data da ata para montar o roteiro daquele domingo.</p>
      ) : (
        <>
          <p className="sub">Domingo {fd(data)}. Escolha quais itens do programa entram. O roteiro fica só neste aparelho e é apagado depois do domingo. Nada vai para o servidor.</p>
          {testemunhos && <p className="dica dica-recente">Jejum e testemunhos: os testemunhos ficam no lugar das mensagens (Manual 29.2.2).</p>}
          {PROGRAMA.map((i) => {
            const on = !!liga[i.id];
            return (
              <div className="ln" key={i.id}>
                <div><b className="num">{i.n}</b> {testemunhos && i.tituloTestemunhos ? i.tituloTestemunhos : i.titulo}{i.nota ? <span> · {i.nota}</span> : null}</div>
                <button className={'btn sw' + (on ? ' on2' : '')} type="button" aria-pressed={on} disabled={i.fixo} onClick={() => gravar({ ...liga, [i.id]: !on })}>{i.fixo ? 'Sempre' : on ? 'Ligado' : 'Desligado'}</button>
              </div>
            );
          })}
          <label className="chk"><input type="checkbox" checked={folhaSep} onChange={(e) => gravar(liga, itens, e.target.checked)} /> Sempre imprimir as falas em folha separada (letra grande)</label>
          <p className="sub">No PDF, as falas entram na ata quando cabem em letra legível; se não couberem, vão para a Folha de falas (página 2). Só saem os blocos com nome e chamado preenchidos.</p>
          <div className="acts">
            <button className="btn peq" type="button" onClick={() => gravar(padraoLiga(), itens)}>Restaurar padrão</button>
            <button className="btn peq" type="button" onClick={apagar}>Apagar deste aparelho</button>
          </div>
        </>
      )}
    </details>
  );
}
