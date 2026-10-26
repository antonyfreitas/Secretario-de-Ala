import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, MESES, soma, ymd } from '../lib/datas';
import { CAMPOS_PROGRESSO, estadoAta, type Ata } from '../lib/tipos';

const CL = { pronta: ' ok', revisao: ' rev', rascunho: ' draft' };
const TX = { pronta: 'pronta', revisao: 'em revisão', rascunho: 'em rascunho' };

export default function Calendario() {
  const { perfil, nuvem } = useAuth();
  const { atas, carregando } = useAtas(perfil?.id, nuvem);
  const nav = useNavigate();
  const [mes, setMes] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
  const [mais, setMais] = useState(10);
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const hj = ymd(hoje);
  const doDia = (k: string): Ata | undefined => atas.filter((x) => x.d.data === k).sort((x, y) => y.atualizado.localeCompare(x.atualizado))[0];
  const abrir = (k: string, r?: Ata) => nav(r ? `/atas/${r.id}` : `/gerador?data=${k}`);

  const ano = mes.getFullYear();
  const m = mes.getMonth();
  const dias = new Date(ano, m + 1, 0).getDate();
  const off = mes.getDay();
  const mudaMes = (n: number) => setMes(new Date(ano, m + n, 1));
  const naMes = ano === hoje.getFullYear() && m === hoje.getMonth();

  const base = ymd(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay()));
  const linhas = Array.from({ length: 3 + mais }, (_, i) => soma(base, 7 * (i - 2)));
  const prox = linhas.find((k) => k >= hj);

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Calendário de domingos</h1>
      <p className="mut">Veja quais domingos já têm ata. Toque em um domingo para criar ou abrir a ata dele.{carregando ? ' Carregando…' : ''}</p>
      <div className="mcal">
        <div className="mhead">
          <button className="nav" type="button" aria-label="Mês anterior" onClick={() => mudaMes(-1)}>‹</button>
          <div>
            <b>{MESES[m]} de {ano}</b>
            {!naMes && <button className="mini" type="button" onClick={() => setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}>Voltar para hoje</button>}
          </div>
          <button className="nav" type="button" aria-label="Próximo mês" onClick={() => mudaMes(1)}>›</button>
        </div>
        <div className="gsem"><span className="dm">D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
        <div className="grade">
          {Array.from({ length: off }, (_, i) => <span key={'v' + i} />)}
          {Array.from({ length: dias }, (_, i) => {
            const t = new Date(ano, m, i + 1);
            const k = ymd(t);
            const dom = t.getDay() === 0;
            const r = doDia(k);
            const cls = 'dia' + (dom ? ' dom' : '') + (r ? CL[estadoAta(r)] : '') + (k === hj ? ' hj' : '') + (dom && !r && k < hj ? ' pas' : '');
            const rot = fd(k) + (r ? `, ata ${TX[estadoAta(r)]}` : dom ? ', sem ata' : '');
            return dom || r
              ? <button key={k} type="button" className={cls} aria-label={rot} onClick={() => abrir(k, r)}>{i + 1}</button>
              : <span key={k} className={cls}>{i + 1}</span>;
          })}
        </div>
        <p className="leg"><span><i className="dot ok" />Pronta</span><span><i className="dot draft" />Rascunho</span><span><i className="dot rev" />Em revisão</span><span><i className="dot vaz" />Sem ata</span></p>
      </div>
      <div>
        {linhas.map((k) => {
          const r = doDia(k);
          const passado = k < hj;
          const n = r ? CAMPOS_PROGRESSO.filter((c) => r.d[c]).length : 0;
          const e = r ? estadoAta(r) : null;
          const st = !r ? (passado ? 'Sem ata' : 'Vazio') : e === 'pronta' ? 'Pronta' : e === 'revisao' ? 'Em revisão' : `Rascunho · ${n}/${CAMPOS_PROGRESSO.length} campos`;
          const cls = 'row' + (r ? CL[estadoAta(r)] : '') + (passado && k !== hj ? ' past' : '');
          return (
            <div key={k} className={cls}>
              <button className="open" type="button" onClick={() => abrir(k, r)}>
                <b>{fd(k)}{k === hj ? <span className="tag">hoje</span> : k === prox ? <span className="tag">próximo</span> : null}</b>
                <span>{st}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="acts"><button className="btn" type="button" onClick={() => setMais(mais + 8)}>Mostrar mais semanas</button></div>
    </main>
  );
}
