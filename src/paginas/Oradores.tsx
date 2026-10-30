import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { diasDesde, fd } from '../lib/datas';
import { haTempo, norm } from '../lib/entrevistas';
import { indexarOradores, POSICAO, type Orador } from '../lib/oradores';

const tomDe = (o: Orador) => {
  const d = diasDesde(o.discursos[0].data);
  return d < 60 ? 'recente' : d > 180 ? 'longo' : 'normal';
};

export default function Oradores() {
  const { perfil, nuvem } = useAuth();
  const { atas, carregando } = useAtas(perfil?.id, nuvem);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'antigos' | 'recentes' | 'mais'>('antigos');
  const [aberto, setAberto] = useState<string | null>(null);
  const indice = useMemo(() => indexarOradores(atas, perfil?.org_id ?? undefined), [atas, perfil?.org_id]);
  const lista = useMemo(() => {
    const q = norm(busca);
    const arr = [...indice.values()].filter((o) => !q || o.chave.includes(q));
    arr.sort((a, b) =>
      ordem === 'antigos' ? a.discursos[0].data.localeCompare(b.discursos[0].data)
      : ordem === 'recentes' ? b.discursos[0].data.localeCompare(a.discursos[0].data)
      : b.discursos.length - a.discursos.length || a.nome.localeCompare(b.nome));
    return arr;
  }, [indice, busca, ordem]);

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Oradores</h1>
      <p className="mut">Montado a partir das atas salvas: quem discursou, quando foi a última vez e quantas vezes. Quanto mais atas salvas, mais completo fica.{carregando ? ' Carregando…' : ''}</p>
      <div className="g">
        <div className="wide"><label htmlFor="bo">Pesquisar um nome</label><input id="bo" type="text" autoComplete="off" className={busca ? 'on' : ''} value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="wide"><label htmlFor="oo">Ordem</label>
          <select id="oo" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)}>
            <option value="antigos">Há mais tempo sem discursar primeiro</option>
            <option value="recentes">Discursaram há pouco primeiro</option>
            <option value="mais">Mais discursos primeiro</option>
          </select></div>
      </div>
      <p className="leg"><span><i className="dot longo" />Faz tempo (mais de 6 meses)</span><span><i className="dot recente" />Há pouco (menos de 2 meses)</span></p>
      {!carregando && lista.length === 0 && <p className="mut">{indice.size ? 'Nenhum nome encontrado.' : 'Ainda não há discursos nas atas salvas. Preencha e salve as atas para formar o histórico.'}</p>}
      {lista.map((o) => {
        const u = o.discursos[0];
        return (
          <div className="pess" key={o.chave}>
            <button className="open2" type="button" onClick={() => setAberto(aberto === o.chave ? null : o.chave)}>
              <b><i className={'dot ' + tomDe(o)} />{o.nome}</b>
              <span>Último discurso: {fd(u.data)} ({haTempo(u.data)}) · {o.discursos.length} {o.discursos.length === 1 ? 'discurso' : 'discursos'}</span>
            </button>
            {aberto === o.chave && o.discursos.map((d) => (
              <div className="ln" key={d.ataId + d.posicao}>
                <span>{fd(d.data)} · {POSICAO[d.posicao]}</span>
                <Link className="btn sw" to={`/atas/${d.ataId}`}>Abrir ata</Link>
              </div>
            ))}
          </div>
        );
      })}
    </main>
  );
}
