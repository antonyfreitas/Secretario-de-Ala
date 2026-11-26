import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Enviar from '../componentes/Enviar';
import HinoInput from '../componentes/HinoInput';
import OradorInput from '../componentes/OradorInput';
import AssuntosFalas from '../componentes/AssuntosFalas';
import RoteiroPainel from '../componentes/RoteiroPainel';
import { baixar, slug } from '../lib/arquivo';
import { novoId, useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, proxDomingo, quando } from '../lib/datas';
import { SECOES } from '../lib/formulario';
import { listarHistorico, type Edicao } from '../lib/nuvem';
import { indexarOradores } from '../lib/oradores';
import { fit } from '../lib/pdf';
import { extrasDoRoteiro } from '../lib/roteiroPdf';
import { useRoteiro } from '../lib/useRoteiro';
import { CHAVES, limpar, vazio, type Ata, type Dados } from '../lib/tipos';

function aparar(d: Dados): Dados {
  const o = { ...d };
  for (const k of CHAVES) o[k] = d[k].trim();
  return o;
}

/** "Ala Túnel Verde" vira "Túnel Verde" (o título da ata já traz a palavra Ala). */
const nomeDaAla = (nome: string) => nome.replace(/^ala\s+/i, '');

export default function Gerador() {
  const { perfil, nuvem, carregando: entrando } = useAuth();
  const { atas, salvar, carregando } = useAtas(perfil?.id, nuvem, perfil?.org_id);
  if (entrando || carregando) return <main><p className="mut">Carregando…</p></main>;
  return <Formulario atas={atas} salvar={salvar} />;
}

function Formulario({ atas, salvar }: { atas: Ata[]; salvar: (a: Ata[]) => Promise<boolean> }) {
  const { perfil, nuvem, org } = useAuth();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const inicial = id ? atas.find((a) => a.id === id) : undefined;
  const [d, setD] = useState<Dados>(() => {
    if (inicial) return limpar(inicial.d);
    const v = vazio(sp.get('data') || proxDomingo());
    if (org) v.ala = nomeDaAla(org.nome);
    return v;
  });
  const [curId, setCurId] = useState<string | null>(inicial ? inicial.id : null);
  const [msg, setMsg] = useState({ t: '', err: false });
  const [historico, setHistorico] = useState<Edicao[]>([]);
  const atual = curId ? atas.find((a) => a.id === curId) : undefined;
  const set = (k: keyof Dados, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));
  const roteiro = useRoteiro(perfil?.id, d.data);
  // se a ala do usuário só ficar disponível depois, preenche o nome (sem sobrescrever o que ele digitou)
  useEffect(() => {
    if (org && !curId) setD((x) => (x.ala ? x : { ...x, ala: nomeDaAla(org.nome) }));
  }, [org, curId]);
  const indice = useMemo(() => indexarOradores(atas, perfil?.org_id ?? undefined), [atas, perfil?.org_id]);


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
      return fit(aparar(x), extrasDoRoteiro(perfil?.id, x.data, x.ala))!.doc.output('blob');
    } catch {
      return null;
    }
  };
  const baixarPdf = (x: Dados, sufixo = '') => {
    try {
      const r = fit(aparar(x), extrasDoRoteiro(perfil?.id, x.data, x.ala))!;
      const nome = nomePdf(x, sufixo);
      baixar(r.doc.output('blob'), nome);
      const nota = r.over ? ' Atenção: conteúdo demais, parte pode ter ficado de fora.' : r.folha ? ' As falas foram para a Folha de falas (página 2).' : r.s < 0.8 ? ' Letras reduzidas para caber em 1 folha.' : '';
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

  const titulo = `Ata da reunião sacramental de ${fd(d.data) || 'data a definir'} - Ala ${d.ala}`;
  const primeiroDomingo = (() => {
    if (!d.data) return false;
    const t = new Date(d.data + 'T12:00:00');
    return t.getDay() === 0 && t.getDate() <= 7;
  })();

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>{curId ? `Editando ata de ${fd(d.data) || 'sem data'}` : 'Ata da reunião sacramental'}</h1>
      <p className="mut">
        Preencha o que já sabe. Campos vazios saem no PDF como linha em branco, para completar à mão. Linha verde = preenchido.
        {!perfil && ' Sem login, nada é salvo: o que você digita some ao fechar a página.'}
      </p>


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

      <div className="seg" role="group" aria-label="Tipo de reunião">
        <button type="button" className={d.testemunhos ? '' : 'on3'} onClick={() => set('testemunhos', false)}>Reunião sacramental</button>
        <button type="button" className={d.testemunhos ? 'on3' : ''} onClick={() => set('testemunhos', true)}>Jejum e testemunhos</button>
      </div>
      {primeiroDomingo && !d.testemunhos && (
        <p className="sub">Este é o primeiro domingo do mês. <button className="lnk2" type="button" onClick={() => set('testemunhos', true)}>Mudar para jejum e testemunhos</button></p>
      )}

      <RoteiroPainel data={d.data} testemunhos={d.testemunhos} r={roteiro} />

      <form onSubmit={(e) => e.preventDefault()}>
        {SECOES.map(([secao, campos]) => {
          if (d.testemunhos && secao === 'Mensagens do evangelho') {
            return (
              <fieldset key={secao}>
                <legend>Jejum e testemunhos</legend>
                <p className="mut">Reunião de jejum e testemunhos: não há oradores nem hino intermediário. O PDF traz um espaço para anotações.</p>
              </fieldset>
            );
          }
          const vis = campos.filter((c) => !c.soLogado || perfil);
          if (!vis.length) return null;
          return (
            <fieldset key={secao}>
              <legend>{secao}</legend>
              {secao === 'Assuntos da ala e da estaca' && <AssuntosFalas data={d.data} ala={d.ala} r={roteiro} />}
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
                      ) : c.tipo === 'orador' ? (
                        <OradorInput id={c.id} valor={v} aoMudar={(x) => set(c.id, x)} indice={indice} dataAta={d.data} ataId={curId} outros={(['orador1', 'orador2', 'orador3'] as const).filter((k) => k !== c.id).map((k) => d[k])} />
                      ) : (
                        <input id={c.id} className={cls} type={c.tipo ?? 'text'} inputMode={c.tipo === 'number' ? 'numeric' : undefined} placeholder={c.dica} value={v} autoComplete="off" onChange={(e) => set(c.id, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </form>

      <Enviar gerar={() => blobPdf(d)} nome={nomePdf(d)} titulo={titulo} orgId={atual?.orgId ?? perfil?.org_id ?? undefined} nuvem={nuvem} />

      <div className="bar">
        <p className={'stbar' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
        <div className="barbtn">
          <button className="btn" type="button" onClick={() => { setD({ ...vazio(proxDomingo()), ala: d.ala }); setCurId(null); setMsg({ t: 'Formulário limpo.', err: false }); }}>Limpar</button>
          {perfil && <button className="btn" type="button" onClick={() => void guardar()}>Salvar</button>}
          <button className="btn p" type="button" onClick={() => baixarPdf(d)}>Gerar PDF</button>
        </div>
      </div>
    </main>
  );
}
