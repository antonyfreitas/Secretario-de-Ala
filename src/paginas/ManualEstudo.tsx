import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { diasDesde, fd, ymd } from '../lib/datas';
import { norm } from '../lib/entrevistas';
import {
  CAPITULOS, definirSemana, gravarEstudo, listarEstudo, MANUAL_URL, POR_NUMERO, PONTOS, pontoDaSemana, semanaISO, SORTEAVEIS, sortear,
  type Estudo, type Ponto,
} from '../lib/manualEstudo';

export default function ManualEstudo() {
  const sem = useMemo(() => semanaISO(new Date()), []);
  const [estudos, setEstudos] = useState<Estudo[]>([]);
  const [semana, setSemana] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState({ t: '', err: false });
  const aviso = (t: string, err = false) => {
    setMsg({ t, err });
    window.setTimeout(() => setMsg((m) => (m.t === t ? { t: '', err: false } : m)), 6000);
  };

  const recarregar = async () => {
    const l = await listarEstudo();
    if (l) setEstudos(l);
    return l ?? [];
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const l = await listarEstudo();
      let p = await pontoDaSemana(sem.chave);
      if (!p && l) {
        const novo = sortear(l);
        if (novo) {
          await definirSemana(sem.chave, novo.n, false);
          p = (await pontoDaSemana(sem.chave)) ?? novo.n; // se outra pessoa sorteou ao mesmo tempo, vale o dela
        }
      }
      if (!vivo) return;
      if (l) setEstudos(l);
      setSemana(p);
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [sem.chave]);

  const porPonto = useMemo(() => new Map(estudos.map((e) => [e.ponto, e])), [estudos]);
  const estudados = estudos.filter((e) => e.estudado_em).sort((a, b) => (b.estudado_em ?? '').localeCompare(a.estudado_em ?? ''));
  const total = SORTEAVEIS.length;
  const feitos = SORTEAVEIS.filter((p) => porPonto.get(p.n)?.estudado_em).length;
  const atual = semana ? POR_NUMERO.get(semana) : undefined;

  const resultados = useMemo(() => {
    const q = norm(busca);
    if (!q) return [] as Ponto[];
    return PONTOS.filter((p) => norm(`${p.n} ${p.t}`).includes(q)).slice(0, 60);
  }, [busca]);

  const marcarEstudado = async (n: string) => {
    const ja = porPonto.get(n)?.estudado_em;
    const ok = await gravarEstudo(estudos, n, { estudado_em: ja ? null : ymd(new Date()) });
    await recarregar();
    aviso(ok ? (ja ? 'Marcação de estudo removida.' : 'Registrado como estudado.') : 'Não foi possível salvar.', !ok);
  };
  const alternarPrioridade = async (n: string) => {
    const ok = await gravarEstudo(estudos, n, { prioridade: !porPonto.get(n)?.prioridade });
    await recarregar();
    if (!ok) aviso('Não foi possível salvar.', true);
  };
  const usarNaSemana = async (n: string) => {
    const ok = await definirSemana(sem.chave, n, semana !== null);
    if (ok) setSemana(n);
    aviso(ok ? `Ponto ${n} definido para esta semana.` : 'Não foi possível definir.', !ok);
  };
  const sortearOutro = async () => {
    const l = await recarregar();
    const novo = sortear(l, semana ?? undefined);
    if (novo) await usarNaSemana(novo.n);
  };

  const linha = (p: Ponto) => {
    const e = porPonto.get(p.n);
    return (
      <div className="ln" key={p.n}>
        <div><b className="num">{p.n}</b> {p.t}{e?.estudado_em ? <span> · estudado em {fd(e.estudado_em)}</span> : null}</div>
        <div className="acts">
          <button className={'btn sw' + (e?.prioridade ? ' on2' : '')} type="button" aria-pressed={!!e?.prioridade} onClick={() => void alternarPrioridade(p.n)}>Prioridade</button>
          <button className={'btn sw' + (e?.estudado_em ? ' on2' : '')} type="button" aria-pressed={!!e?.estudado_em} onClick={() => void marcarEstudado(p.n)}>Estudado</button>
          <button className="btn sw" type="button" onClick={() => void usarNaSemana(p.n)}>Usar na semana</button>
        </div>
      </div>
    );
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Estudo do Manual</h1>
      <p className="mut">Um ponto do Manual Geral por semana, sorteado para a ala estudar. Todos os usuários da ala veem o mesmo ponto e o mesmo progresso.</p>

      <div className="card">
        <p className="sub">Semana de {fd(sem.inicio)} a {fd(sem.fim)}</p>
        {carregando ? <p>Sorteando…</p> : atual ? (
          <>
            <p className="ponto"><b className="num">{atual.n}</b> {atual.t}</p>
            <p className="sub">Capítulo {atual.cap}: {CAPITULOS.get(atual.cap)}</p>
            {porPonto.get(atual.n)?.estudado_em && <p className="dica dica-longo">Já estudado em {fd(porPonto.get(atual.n)!.estudado_em!)}{porPonto.get(atual.n)?.por_nome ? ` (registrado por ${porPonto.get(atual.n)!.por_nome})` : ''}.</p>}
            <div className="acts">
              <a className="btn p peq" href={MANUAL_URL} target="_blank" rel="noopener noreferrer">Abrir o Manual Geral</a>
              <button className={'btn peq' + (porPonto.get(atual.n)?.estudado_em ? ' on2' : '')} type="button" onClick={() => void marcarEstudado(atual.n)}>{porPonto.get(atual.n)?.estudado_em ? 'Estudado ✓' : 'Já estudamos'}</button>
              <button className="btn peq" type="button" onClick={() => void sortearOutro()}>Sortear outro</button>
              <button className={'btn peq' + (porPonto.get(atual.n)?.prioridade ? ' on2' : '')} type="button" aria-pressed={!!porPonto.get(atual.n)?.prioridade} onClick={() => void alternarPrioridade(atual.n)}>Prioridade</button>
            </div>
            <p className="sub">No Manual Geral, procure o capítulo {atual.cap} e o ponto {atual.n}.</p>
          </>
        ) : <p className="mut">Não foi possível carregar o ponto da semana.</p>}
      </div>

      <p className="sub">Progresso da ala: {feitos} de {total} pontos estudados.</p>
      <div className="barra" aria-hidden="true"><i className={'p' + Math.min(100, Math.round((feitos / total) * 20) * 5)} /></div>
      <p className="sub">Pontos marcados como prioridade são sorteados com mais frequência. O sorteio evita repetir o que já foi estudado.</p>

      <div className="g"><div className="wide"><label htmlFor="bm">Procurar um ponto (número ou palavra, ex.: 18.7 ou batismo)</label>
        <input id="bm" type="text" autoComplete="off" className={busca ? 'on' : ''} value={busca} onChange={(e) => setBusca(e.target.value)} /></div></div>
      {busca && (resultados.length === 0 ? <p className="mut">Nada encontrado.</p> : resultados.map(linha))}

      {estudados.length > 0 && (
        <details className="card">
          <summary><b>Já estudados ({estudados.length})</b></summary>
          {estudados.slice(0, 40).map((e) => {
            const p = POR_NUMERO.get(e.ponto);
            return <div className="ln" key={e.ponto}><span><b className="num">{e.ponto}</b> {p?.t} · {fd(e.estudado_em ?? '')}{e.estudado_em ? ` (${diasDesde(e.estudado_em) === 0 ? 'hoje' : `há ${diasDesde(e.estudado_em)} dias`})` : ''}{e.por_nome ? ` · ${e.por_nome}` : ''}</span></div>;
          })}
        </details>
      )}
      <p className="sub">A lista de pontos cobre, por enquanto, os capítulos 0 a 26 por seções e subseções; os capítulos 27 a 38 entram inteiros e serão detalhados em seguida.</p>
      {msg.t && <div className={'toast' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</div>}
    </main>
  );
}
