import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Enviar from '../componentes/Enviar';
import HinoInput from '../componentes/HinoInput';
import { baixar, slug } from '../lib/arquivo';
import { novoId, useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, proxDomingo, quando } from '../lib/datas';
import { SECOES } from '../lib/formulario';
import { listarHistorico, listarOrgs, type Edicao, type Org } from '../lib/nuvem';
import { fit } from '../lib/pdf';
import { CHAVES, limpar, vazio, type Ata, type Dados } from '../lib/tipos';

function aparar(d: Dados): Dados {
  const o = { ...d };
  for (const k of CHAVES) o[k] = d[k].trim();
  return o;
}

export default function Gerador() {
  const { perfil, nuvem } = useAuth();
  const { atas, salvar, carregando } = useAtas(perfil?.id, nuvem);
  if (carregando) return <main><p className="mut">Carregando…</p></main>;
  return <Formulario atas={atas} salvar={salvar} />;
}

function Formulario({ atas, salvar }: { atas: Ata[]; salvar: (a: Ata[]) => Promise<boolean> }) {
  const { perfil, nuvem } = useAuth();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const inicial = id ? atas.find((a) => a.id === id) : undefined;
  const [d, setD] = useState<Dados>(() => (inicial ? limpar(inicial.d) : vazio(sp.get('data') || proxDomingo())));
  const [curId, setCurId] = useState<string | null>(inicial ? inicial.id : null);
  const [msg, setMsg] = useState({ t: '', err: false });
  const [historico, setHistorico] = useState<Edicao[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgSel, setOrgSel] = useState(inicial?.orgId ?? perfil?.org_id ?? '');
  const atual = curId ? atas.find((a) => a.id === curId) : undefined;
  const global = perfil?.role === 'admin';
  const set = (k: keyof Dados, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!nuvem || !global) return;
    let vivo = true;
    void listarOrgs().then((l) => { if (vivo) setOrgs(l.filter((o) => o.nuvem)); });
    return () => { vivo = false; };
  }, [nuvem, global]);

  useEffect(() => {
    if (!nuvem || !curId) return;
    let vivo = true;
    void listarHistorico(curId).then((h) => { if (vivo) setHistorico(h); });
    return () => { vivo = false; };
  }, [nuvem, curId, atual?.atualizado]);

  if (id && !inicial) {
    return <main><Link className="back" to="/atas">‹ Atas salvas</Link><h1>Ata não encontrada</h1></main>;
  }

  const nomePdf = (x: Dados, sufixo = '') => `ata-ala-${slug(x.ala)}-${x.data || 'sem-data'}${sufixo}.pdf`;
  const blobPdf = (x: Dados): Blob | null => {
    try {
      return fit(aparar(x))!.doc.output('blob');
    } catch {
      return null;
    }
  };
  const baixarPdf = (x: Dados, sufixo = '') => {
    try {
      const r = fit(aparar(x))!;
      const nome = nomePdf(x, sufixo);
      baixar(r.doc.output('blob'), nome);
      const nota = r.over ? ' Atenção: conteúdo demais, parte pode ter ficado de fora.' : r.s < 0.8 ? ' Letras reduzidas para caber em 1 folha.' : '';
      setMsg({ t: `PDF pronto: ${nome}.${nota}`, err: false });
    } catch {
      setMsg({ t: 'Não foi possível gerar o PDF. Recarregue a página e tente de novo.', err: true });
    }
  };

  const guardar = async () => {
    const dd = aparar(d);
    if (dd.semAssuntos) dd.assuntos = '';
    const agora = new Date().toISOString();
    const a = [...atas];
    const i = a.findIndex((x) => x.id === curId);
    let r: Ata;
    if (i >= 0) {
      r = { ...a[i], d: dd, atualizado: agora };
      a[i] = r;
    } else {
      r = { v: 1, id: novoId(), criado: agora, atualizado: agora, d: dd, ...(global && orgSel ? { orgId: orgSel } : {}) };
      a.push(r);
    }
    if (await salvar(a)) {
      setCurId(r.id);
      setMsg({ t: `Ata salva ${nuvem ? 'na nuvem' : 'neste aparelho'}: ${fd(dd.data) || 'sem data'}.`, err: false });
    } else {
      setMsg({ t: nuvem ? 'Não foi possível salvar. Alguém pode ter alterado esta ata: volte à lista e abra de novo.' : 'Não foi possível salvar: o navegador bloqueou o armazenamento.', err: true });
    }
  };

  const titulo = `Ata da reunião sacramental de ${fd(d.data) || 'data a definir'} - Ala ${d.ala}`;

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>{curId ? `Editando ata de ${fd(d.data) || 'sem data'}` : 'Ata da reunião sacramental'}</h1>
      <p className="mut">
        Preencha o que já sabe. Campos vazios saem no PDF como linha em branco, para completar à mão. Linha verde = preenchido.
        {!perfil && ' Sem login, nada é salvo: o que você digita some ao fechar a página.'}
      </p>

      {nuvem && global && !curId && orgs.length > 1 && (
        <div className="g"><div className="wide"><label htmlFor="org">Salvar na ala</label>
          <select id="org" value={orgSel} onChange={(e) => setOrgSel(e.target.value)}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div></div>
      )}

      {nuvem && atual?.atualizadoPorNome && <p className="sub">Última edição por <b>{atual.atualizadoPorNome}</b> em {quando(atual.atualizado)}.</p>}
      {nuvem && historico.length > 1 && (
        <details className="card">
          <summary><b>Histórico de edições ({historico.length})</b></summary>
          {historico.map((h) => (
            <div className="ln" key={h.em}>
              <span>{quando(h.em)} · {h.por ?? 'usuário'}</span>
              <button className="btn sw" type="button" onClick={() => baixarPdf(h.d, `-${h.em.slice(0, 16).replace(/[^0-9]/g, '')}`)}>PDF desta versão</button>
            </div>
          ))}
        </details>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        {SECOES.map(([secao, campos]) => {
          const vis = campos.filter((c) => !c.soLogado || perfil);
          if (!vis.length) return null;
          return (
            <fieldset key={secao}>
              <legend>{secao}</legend>
              <div className="g">
                {vis.map((c) => {
                  if (c.tipo === 'check') {
                    return (
                      <label key={c.id} className="ck wide">
                        <input type="checkbox" checked={Boolean(d[c.id])} onChange={(e) => set(c.id, e.target.checked)} /> {c.rotulo}
                      </label>
                    );
                  }
                  const v = String(d[c.id]);
                  const cls = v.trim() ? 'on' : '';
                  return (
                    <div key={c.id} className={c.larga ? 'wide' : ''}>
                      <label htmlFor={c.id}>{c.rotulo}</label>
                      {c.tipo === 'area' ? (
                        <textarea id={c.id} className={cls} value={v} placeholder={c.dica} onChange={(e) => set(c.id, e.target.value)} />
                      ) : c.tipo === 'hino' ? (
                        <HinoInput id={c.id} valor={v} aoMudar={(x) => set(c.id, x)} />
                      ) : (
                        <input id={c.id} className={cls} type={c.tipo ?? 'text'} inputMode={c.tipo === 'number' ? 'numeric' : undefined} value={v} autoComplete="off" onChange={(e) => set(c.id, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </form>

      <Enviar gerar={() => blobPdf(d)} nome={nomePdf(d)} titulo={titulo} orgId={atual?.orgId ?? (orgSel || undefined)} nuvem={nuvem} />

      <div className="bar">
        <p className={'stbar' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
        <div className="barbtn">
          <button className="btn" type="button" onClick={() => { setD(vazio(proxDomingo())); setCurId(null); setMsg({ t: 'Formulário limpo.', err: false }); }}>Limpar</button>
          {perfil && <button className="btn" type="button" onClick={() => void guardar()}>Salvar</button>}
          <button className="btn p" type="button" onClick={() => baixarPdf(d)}>Gerar PDF</button>
        </div>
      </div>
    </main>
  );
}
