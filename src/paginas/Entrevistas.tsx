import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fd, MESES, ymd } from '../lib/datas';
import { excluirEntrevista, gravarEntrevista, haTempo, listarEntrevistas, norm, TIPOS, type Entrevista } from '../lib/entrevistas';

type Form = { id?: string; data: string; pessoa: string; entrevistador: string; tipo: string; assunto: string };
const hojeStr = () => ymd(new Date());

export default function Entrevistas() {
  const { org } = useAuth();
  const [lista, setLista] = useState<Entrevista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'antigas' | 'recentes'>('antigas');
  const [aba, setAba] = useState<'pessoas' | 'calendario'>('pessoas');
  const [form, setForm] = useState<Form | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mes, setMes] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
  const [dia, setDia] = useState<string | null>(null);
  const [armado, setArmado] = useState<string | null>(null);
  const [msg, setMsg] = useState({ t: '', err: false });

  const carregar = async () => {
    const l = await listarEntrevistas();
    if (l) setLista(l);
    setCarregando(false);
  };
  useEffect(() => { void carregar(); }, []);

  const q = norm(busca);
  const visiveis = useMemo(
    () => (q ? lista.filter((e) => norm([e.pessoa, e.entrevistador, e.assunto, TIPOS[e.tipo], fd(e.data)].join(' ')).includes(q)) : lista),
    [lista, q],
  );
  const grupos = useMemo(() => {
    const m = new Map<string, Entrevista[]>();
    for (const e of visiveis) {
      const k = norm(e.pessoa);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    const arr = [...m.entries()].map(([k, itens]) => ({ k, itens: [...itens].sort((a, b) => b.data.localeCompare(a.data)) }));
    arr.sort((a, b) => (ordem === 'antigas' ? a.itens[0].data.localeCompare(b.itens[0].data) : b.itens[0].data.localeCompare(a.itens[0].data)));
    return arr;
  }, [visiveis, ordem]);
  const pessoas = useMemo(() => [...new Set(lista.map((e) => e.pessoa))].sort(), [lista]);
  const entrevistadores = useMemo(() => [...new Set(lista.map((e) => e.entrevistador))].sort(), [lista]);

  if (!org?.entrevistas) {
    return <main><Link className="back" to="/">‹ Início</Link><h1>Entrevistas</h1><p className="mut">Este recurso está desligado para a sua ala. Peça ao administrador da ala para ligar em Administração.</p></main>;
  }

  const aviso = (t: string, err = false) => setMsg({ t, err });
  const novo = () => setForm({ data: hojeStr(), pessoa: '', entrevistador: lista[0]?.entrevistador ?? '', tipo: 'outro', assunto: '' });
  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const erro = await gravarEntrevista(form);
    if (erro) return aviso(`Não foi possível salvar: ${erro}.`, true);
    setForm(null);
    aviso('Entrevista salva.');
    await carregar();
  };
  const excluir = async (id: string) => {
    if (armado !== id) { setArmado(id); setTimeout(() => setArmado((a) => (a === id ? null : a)), 4000); return; }
    setArmado(null);
    aviso((await excluirEntrevista(id)) ? 'Entrevista excluída.' : 'Não foi possível excluir (só quem registrou ou o administrador da ala).', false);
    await carregar();
  };

  const linha = (e: Entrevista) => (
    <div className="ln" key={e.id}>
      <div><b>{fd(e.data)}</b> <span>por {e.entrevistador} · {TIPOS[e.tipo]}{e.assunto ? ` · ${e.assunto}` : ''}{aba === 'calendario' ? ` · ${e.pessoa}` : ''}</span></div>
      <div className="acts">
        <button className="btn sw" type="button" onClick={() => setForm({ id: e.id, data: e.data, pessoa: e.pessoa, entrevistador: e.entrevistador, tipo: e.tipo, assunto: e.assunto })}>Editar</button>
        <button className="btn sw" type="button" onClick={() => void excluir(e.id)}>{armado === e.id ? 'Confirmar: excluir' : 'Excluir'}</button>
      </div>
    </div>
  );

  // calendário do mês
  const ano = mes.getFullYear();
  const m = mes.getMonth();
  const dias = new Date(ano, m + 1, 0).getDate();
  const off = mes.getDay();
  const contagem: Record<string, number> = {};
  for (const e of visiveis) contagem[e.data] = (contagem[e.data] ?? 0) + 1;
  const doMes = visiveis.filter((e) => e.data.startsWith(`${ano}-${String(m + 1).padStart(2, '0')}`));
  const listaDia = dia ? visiveis.filter((e) => e.data === dia) : doMes;
  const hj = hojeStr();

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Entrevistas</h1>
      <p className="mut">Só os usuários da sua ala veem. Use apelido ou só o primeiro nome e registre apenas o tipo e um assunto bem geral. Não escreva confissões, saúde, finanças nem detalhes pessoais.</p>

      <div className="g"><div className="wide"><label htmlFor="busca">Pesquisar (pessoa, quem entrevistou, assunto, tipo ou data)</label>
        <input id="busca" type="text" autoComplete="off" value={busca} className={busca ? 'on' : ''} onChange={(e) => { setBusca(e.target.value); setDia(null); }} /></div></div>
      <div className="acts">
        <button className="btn p" type="button" onClick={novo}>Registrar entrevista</button>
        <button className={'btn' + (aba === 'pessoas' ? ' on2' : '')} type="button" onClick={() => setAba('pessoas')}>Por pessoa</button>
        <button className={'btn' + (aba === 'calendario' ? ' on2' : '')} type="button" onClick={() => setAba('calendario')}>Calendário</button>
      </div>
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>

      {form && (
        <form className="card col" onSubmit={salvar}>
          <div><label htmlFor="fd">Data</label><input id="fd" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
          <div><label htmlFor="fp">Quem foi entrevistado (apelido ou primeiro nome)</label><input id="fp" type="text" list="lp" maxLength={40} autoComplete="off" value={form.pessoa} onChange={(e) => setForm({ ...form, pessoa: e.target.value })} required minLength={2} /><datalist id="lp">{pessoas.map((p) => <option key={p} value={p} />)}</datalist></div>
          <div><label htmlFor="fe">Quem entrevistou</label><input id="fe" type="text" list="le" maxLength={40} autoComplete="off" value={form.entrevistador} onChange={(e) => setForm({ ...form, entrevistador: e.target.value })} required minLength={2} /><datalist id="le">{entrevistadores.map((p) => <option key={p} value={p} />)}</datalist></div>
          <div><label htmlFor="ft">Tipo</label><select id="ft" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label htmlFor="fa">Assunto geral (opcional, até 100 letras)</label><input id="fa" type="text" maxLength={100} autoComplete="off" value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} /></div>
          <div className="acts"><button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button><button className="btn p" type="submit">Salvar</button></div>
        </form>
      )}

      {carregando && <p className="mut">Carregando…</p>}

      {aba === 'pessoas' && (
        <div>
          <div className="g"><div className="wide"><label htmlFor="ord">Ordem</label>
            <select id="ord" value={ordem} onChange={(e) => setOrdem(e.target.value as 'antigas' | 'recentes')}><option value="antigas">Há mais tempo sem entrevista primeiro</option><option value="recentes">Mais recentes primeiro</option></select></div></div>
          {!carregando && grupos.length === 0 && <p className="mut">{lista.length ? 'Nada encontrado.' : 'Nenhuma entrevista registrada ainda.'}</p>}
          {grupos.map((g) => {
            const u = g.itens[0];
            return (
              <div className="pess" key={g.k}>
                <button className="open2" type="button" onClick={() => setAberta(aberta === g.k ? null : g.k)}>
                  <b>{u.pessoa}</b>
                  <span>Última: {fd(u.data)} ({haTempo(u.data)}) por {u.entrevistador} · {g.itens.length} {g.itens.length === 1 ? 'entrevista' : 'entrevistas'}</span>
                </button>
                {aberta === g.k && g.itens.map(linha)}
              </div>
            );
          })}
        </div>
      )}

      {aba === 'calendario' && (
        <div>
          <div className="mcal">
            <div className="mhead">
              <button className="nav" type="button" aria-label="Mês anterior" onClick={() => { setMes(new Date(ano, m - 1, 1)); setDia(null); }}>‹</button>
              <div><b>{MESES[m]} de {ano}</b></div>
              <button className="nav" type="button" aria-label="Próximo mês" onClick={() => { setMes(new Date(ano, m + 1, 1)); setDia(null); }}>›</button>
            </div>
            <div className="gsem"><span className="dm">D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
            <div className="grade">
              {Array.from({ length: off }, (_, i) => <span key={'v' + i} />)}
              {Array.from({ length: dias }, (_, i) => {
                const k = ymd(new Date(ano, m, i + 1));
                const n = contagem[k] ?? 0;
                const cls = 'dia' + (n ? ' ok' : '') + (k === hj ? ' hj' : '') + (dia === k ? ' sel' : '');
                return n
                  ? <button key={k} type="button" className={cls} aria-label={`${fd(k)}, ${n} entrevista(s)`} onClick={() => setDia(dia === k ? null : k)}>{i + 1}</button>
                  : <span key={k} className={cls}>{i + 1}</span>;
              })}
            </div>
          </div>
          <p className="sub">{dia ? `Entrevistas de ${fd(dia)}` : `Entrevistas de ${MESES[m]} de ${ano}`}</p>
          {listaDia.length === 0 ? <p className="mut">Nenhuma entrevista neste período.</p> : listaDia.map(linha)}
        </div>
      )}
    </main>
  );
}
