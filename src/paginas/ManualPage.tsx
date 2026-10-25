import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fd, mesTxt, soma, ymd } from '../lib/datas';
import { useManual } from '../lib/manual';

const URL_SUMARIO = 'https://www.churchofjesuschrist.org/study/manual/general-handbook/summary-of-recent-updates?lang=por';

export default function ManualPage() {
  const { perfil } = useAuth();
  const { auto, m, salvar, naoLida } = useManual(perfil?.id);
  const [mes, setMes] = useState(m.ultimoMes || '');
  const [nota, setNota] = useState(m.nota || '');
  const [msg, setMsg] = useState({ t: '', err: false });
  const hoje = () => ymd(new Date());

  const registrar = () => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return setMsg({ t: 'Informe o mês no formato aaaa-mm, por exemplo 2026-03.', err: true });
    let t: string;
    let lido = m.lido;
    if (!m.ultimoMes) { t = 'Primeira verificação registrada. Daqui para a frente aviso quando o mês mudar.'; lido = true; }
    else if (mes > m.ultimoMes) { t = `Atualização nova desde a última vez (${mesTxt(mes)}). Leia as mudanças no site oficial e avise o bispado.`; lido = false; }
    else if (mes < m.ultimoMes) return setMsg({ t: 'Esse mês é anterior ao último registrado. Confira o primeiro título da página.', err: true });
    else t = 'Sem mudanças desde a última verificação.';
    salvar({ ...m, ultimoMes: mes, verificado: hoje(), lido });
    setMsg({ t, err: false });
  };
  const marcarLida = () => {
    salvar({ ...m, ultimoMes: auto ? auto.ultimoMes : m.ultimoMes, lido: true, verificado: hoje() });
    setMsg({ t: 'Marcada como lida.', err: false });
  };
  const guardarNota = () => {
    salvar({ ...m, nota: nota.trim().slice(0, 3000) });
    setMsg({ t: 'Anotação salva neste aparelho.', err: false });
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Atualizações do Manual</h1>
      <p className="mut">O Manual Geral muda poucas vezes por ano. {auto ? 'Um monitor automático confere o Sumário toda semana.' : 'Abra o Sumário de atualizações recentes e registre aqui o mês da atualização mais recente.'}</p>
      <div className="card">
        {auto ? (
          <>
            <p><b>Monitor automático:</b> verificou em {fd(auto.verificado)}.</p>
            <p><b>Última atualização:</b> {mesTxt(auto.ultimoMes)}{auto.mudouEm ? ` (detectada em ${fd(auto.mudouEm)})` : ''}</p>
            {auto.textoMudouEm && <p>O texto da página foi ajustado em {fd(auto.textoMudouEm)} (pode ser um ajuste pequeno).</p>}
            {m.ultimoMes && <p>Você confirmou a leitura até {mesTxt(m.ultimoMes)}.</p>}
          </>
        ) : m.verificado ? (
          <>
            <p><b>Última atualização vista:</b> {mesTxt(m.ultimoMes)}</p>
            <p>Verificado em {fd(m.verificado)}. Próxima checagem sugerida: {fd(soma(m.verificado, 30))}.</p>
          </>
        ) : <p>Nenhuma verificação registrada ainda.</p>}
        {naoLida && <p><b>Atualização nova.</b> Leia as mudanças no site oficial e avise o bispado.</p>}
      </div>
      <a className="lnk" href={URL_SUMARIO} target="_blank" rel="noopener noreferrer">Abrir o Sumário de atualizações recentes</a>
      {!auto && (
        <div className="g">
          <div className="wide"><label htmlFor="mmes">Mês da atualização mais recente (primeiro título da página)</label><input id="mmes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        </div>
      )}
      <div className="acts">
        {!auto && <button className="btn p" type="button" onClick={registrar}>Registrar verificação</button>}
        {naoLida && <button className="btn" type="button" onClick={marcarLida}>Marcar como lida</button>}
      </div>
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
      <div className="g">
        <div className="wide"><label htmlFor="mnota">Anotações da ala (o que muda para nós)</label><textarea id="mnota" value={nota} placeholder="Ex.: o capítulo 20 mudou as regras de atividades; avisar o conselho" onChange={(e) => setNota(e.target.value)} onBlur={guardarNota} /></div>
      </div>
      <p className="mut">Nada do Manual é copiado para cá. Ficam só o mês e as suas anotações, neste aparelho.</p>
    </main>
  );
}
