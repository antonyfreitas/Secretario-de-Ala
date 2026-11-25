import { useEffect, useState } from 'react';
import { PROGRAMA } from '../dados/roteiro';
import { fd } from '../lib/datas';
import { apagarRoteiro, carregarRoteiro, limparExpirados, padraoLiga, salvarRoteiro } from '../lib/roteiro';

interface Props { uid?: string; data: string; testemunhos: boolean }

/** Roteiro da reunião: quais dos 12 itens do programa entram neste domingo. Guardado só neste aparelho. */
export default function RoteiroPainel({ uid, data, testemunhos }: Props) {
  const [liga, setLiga] = useState<Record<string, boolean>>(padraoLiga);

  useEffect(() => { limparExpirados(); }, []);
  useEffect(() => {
    if (data) setLiga(carregarRoteiro(uid, data).liga);
  }, [uid, data]);

  const gravar = (novo: Record<string, boolean>) => {
    setLiga(novo);
    if (data) salvarRoteiro(uid, { versao: 1, data, liga: novo });
  };
  const ligados = PROGRAMA.filter((i) => liga[i.id]).length;

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
                <button className={'btn sw' + (on ? ' on2' : '')} type="button" aria-pressed={on} disabled={i.fixo} onClick={() => gravar({ ...liga, [i.id]: !on })}>{i.fixo ? 'Sempre' : on ? 'Ligado' : 'Desligado'}</button>
              </div>
            );
          })}
          <div className="acts">
            <button className="btn peq" type="button" onClick={() => gravar(padraoLiga())}>Restaurar padrão</button>
            <button className="btn peq" type="button" onClick={() => { apagarRoteiro(uid, data); setLiga(padraoLiga()); }}>Apagar deste aparelho</button>
          </div>
        </>
      )}
    </details>
  );
}
