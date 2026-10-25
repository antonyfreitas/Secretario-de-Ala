import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import HinoInput from '../componentes/HinoInput';
import { baixar, slug } from '../lib/arquivo';
import { novoId, useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, proxDomingo } from '../lib/datas';
import { SECOES } from '../lib/formulario';
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
  const set = (k: keyof Dados, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  if (id && !inicial) {
    return <main><Link className="back" to="/atas">‹ Atas salvas</Link><h1>Ata não encontrada</h1></main>;
  }

  const gerar = () => {
    try {
      const r = fit(aparar(d))!;
      const nome = `ata-ala-${slug(d.ala)}-${d.data || 'sem-data'}.pdf`;
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
      r = { v: 1, id: novoId(), criado: agora, atualizado: agora, d: dd };
      a.push(r);
    }
    if (await salvar(a)) {
      setCurId(r.id);
      setMsg({ t: `Ata salva ${nuvem ? 'na nuvem' : 'neste aparelho'}: ${fd(dd.data) || 'sem data'}.`, err: false });
    } else {
      setMsg({ t: nuvem ? 'Não foi possível salvar. Alguém pode ter alterado esta ata: volte à lista e abra de novo.' : 'Não foi possível salvar: o navegador bloqueou o armazenamento.', err: true });
    }
  };

  return (
    <main>
      <Link className="back" to={perfil ? '/' : '/'}>‹ Início</Link>
      <h1>{curId ? `Editando ata de ${fd(d.data) || 'sem data'}` : 'Ata da reunião sacramental'}</h1>
      <p className="mut">
        Preencha o que já sabe. Campos vazios saem no PDF como linha em branco, para completar à mão. Linha verde = preenchido.
        {!perfil && ' Sem login, nada é salvo: o que você digita some ao fechar a página.'}
      </p>
      <form onSubmit={(e) => e.preventDefault()}>
        {SECOES.map(([titulo, campos]) => {
          const vis = campos.filter((c) => !c.soLogado || perfil);
          if (!vis.length) return null;
          return (
            <fieldset key={titulo}>
              <legend>{titulo}</legend>
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
      <div className="bar">
        <p className={'stbar' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
        <div className="barbtn">
          <button className="btn" type="button" onClick={() => { setD(vazio(proxDomingo())); setCurId(null); setMsg({ t: 'Formulário limpo.', err: false }); }}>Limpar</button>
          {perfil && <button className="btn" type="button" onClick={() => void guardar()}>Salvar</button>}
          <button className="btn p" type="button" onClick={gerar}>Gerar PDF</button>
        </div>
      </div>
    </main>
  );
}
