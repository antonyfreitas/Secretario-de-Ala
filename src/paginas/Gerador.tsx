import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import HinoInput from '../componentes/HinoInput';
import { baixar, slug } from '../lib/arquivo';
import { novoId, useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, proxDomingo, quando } from '../lib/datas';
import { SECOES } from '../lib/formulario';
import { acaoAta, listarVersoes, type Acao, type Versao } from '../lib/nuvem';
import { fit } from '../lib/pdf';
import { CHAVES, ROTULO_SITUACAO, limpar, vazio, type Ata, type Dados } from '../lib/tipos';

function aparar(d: Dados): Dados {
  const o = { ...d };
  for (const k of CHAVES) o[k] = d[k].trim();
  return o;
}

export default function Gerador() {
  const { perfil, nuvem } = useAuth();
  const { atas, salvar, carregando, recarregar } = useAtas(perfil?.id, nuvem);
  if (carregando) return <main><p className="mut">Carregando…</p></main>;
  return <Formulario atas={atas} salvar={salvar} recarregar={recarregar} />;
}

function Formulario({ atas, salvar, recarregar }: { atas: Ata[]; salvar: (a: Ata[]) => Promise<boolean>; recarregar: () => Promise<void> }) {
  const { perfil, nuvem } = useAuth();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const inicial = id ? atas.find((a) => a.id === id) : undefined;
  const [d, setD] = useState<Dados>(() => (inicial ? limpar(inicial.d) : vazio(sp.get('data') || proxDomingo())));
  const [curId, setCurId] = useState<string | null>(inicial ? inicial.id : null);
  const [msg, setMsg] = useState({ t: '', err: false });
  const [motivo, setMotivo] = useState('');
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const atual = curId ? atas.find((a) => a.id === curId) : undefined;
  const status = nuvem && atual?.status ? atual.status : 'rascunho';
  const bloqueada = status !== 'rascunho';
  const podeAprovar = perfil?.role === 'admin' || perfil?.role === 'aprovador';
  const euEnviei = !!atual && atual.enviadaPor === perfil?.id;
  const set = (k: keyof Dados, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!nuvem || !curId || !atual?.status) return;
    let vivo = true;
    void listarVersoes(curId).then((v) => { if (vivo) setVersoes(v); });
    return () => { vivo = false; };
  }, [nuvem, curId, atual?.status, atual?.versao]);

  if (id && !inicial) {
    return <main><Link className="back" to="/atas">‹ Atas salvas</Link><h1>Ata não encontrada</h1></main>;
  }

  const baixarPdf = (x: Dados, sufixo = '') => {
    try {
      const r = fit(aparar(x))!;
      const nome = `ata-ala-${slug(x.ala)}-${x.data || 'sem-data'}${sufixo}.pdf`;
      baixar(r.doc.output('blob'), nome);
      const nota = r.over ? ' Atenção: conteúdo demais, parte pode ter ficado de fora.' : r.s < 0.8 ? ' Letras reduzidas para caber em 1 folha.' : '';
      setMsg({ t: `PDF pronto: ${nome}.${nota}`, err: false });
    } catch {
      setMsg({ t: 'Não foi possível gerar o PDF. Recarregue a página e tente de novo.', err: true });
    }
  };

  const guardar = async (): Promise<string | null> => {
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
      return r.id;
    }
    setMsg({ t: nuvem ? 'Não foi possível salvar. Alguém pode ter alterado esta ata: volte à lista e abra de novo.' : 'Não foi possível salvar: o navegador bloqueou o armazenamento.', err: true });
    return null;
  };

  const rodar = async (acao: Acao, texto: string, alvo: string | null) => {
    if (!alvo) return;
    const e = await acaoAta(acao, alvo, motivo);
    await recarregar();
    setMotivo('');
    setMsg({ t: e ? `Não foi possível: ${e}.` : texto, err: Boolean(e) });
  };
  const enviar = async () => {
    const alvo = await guardar();
    await rodar('enviar_para_revisao', 'Enviada para aprovação. Fica bloqueada até ser aprovada ou devolvida.', alvo);
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>{curId ? `Editando ata de ${fd(d.data) || 'sem data'}` : 'Ata da reunião sacramental'}</h1>
      <p className="mut">
        Preencha o que já sabe. Campos vazios saem no PDF como linha em branco, para completar à mão. Linha verde = preenchido.
        {!perfil && ' Sem login, nada é salvo: o que você digita some ao fechar a página.'}
      </p>

      {nuvem && atual && (
        <div className="card">
          <p><b>Situação:</b> {ROTULO_SITUACAO[status]}{atual.versao && atual.versao > 1 ? ` · versão ${atual.versao}` : ''}</p>
          {status === 'rascunho' && atual.comentario && <p><b>Devolvida:</b> {atual.comentario}</p>}
          {status === 'em_revisao' && <p>Enviada por {atual.enviadaPorNome ?? 'alguém'} para aprovação. Está bloqueada para edição.</p>}
          {status === 'aprovada' && <p>Aprovada por {atual.aprovadaPorNome ?? 'um aprovador'} em {quando(atual.aprovadaEm ?? '')}. Para alterar, é preciso reabrir; a próxima aprovação vira a versão seguinte.</p>}
          {status === 'em_revisao' && podeAprovar && !euEnviei && (
            <div><label htmlFor="mot">Motivo da devolução (opcional)</label><textarea id="mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          )}
          <div className="acts">
            {status === 'rascunho' && <button className="btn" type="button" onClick={() => void enviar()}>Enviar para aprovação</button>}
            {status === 'em_revisao' && podeAprovar && !euEnviei && <button className="btn p" type="button" onClick={() => void rodar('aprovar_ata', 'Ata aprovada e registrada no histórico.', curId)}>Aprovar</button>}
            {status === 'em_revisao' && (podeAprovar || euEnviei) && <button className="btn" type="button" onClick={() => void rodar('devolver_ata', euEnviei ? 'Retirada da revisão.' : 'Ata devolvida para ajustes.', curId)}>{euEnviei ? 'Retirar da revisão' : 'Devolver'}</button>}
            {status === 'aprovada' && podeAprovar && <button className="btn" type="button" onClick={() => void rodar('reabrir_ata', 'Ata reaberta para edição.', curId)}>Reabrir para edição</button>}
          </div>
          {versoes.length > 0 && (
            <div>
              <p className="sub">Versões aprovadas</p>
              {versoes.map((v) => (
                <div className="ln" key={v.versao}>
                  <span>v{v.versao} · {v.aprovadaPorNome ?? 'aprovador'} · {quando(v.aprovadaEm)} · {v.hash.slice(0, 8)}</span>
                  <button className="btn sw" type="button" onClick={() => baixarPdf(v.d, `-v${v.versao}`)}>PDF desta versão</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        {SECOES.map(([titulo, campos]) => {
          const vis = campos.filter((c) => !c.soLogado || perfil);
          if (!vis.length) return null;
          return (
            <fieldset key={titulo} disabled={bloqueada}>
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
          {!bloqueada && <button className="btn" type="button" onClick={() => { setD(vazio(proxDomingo())); setCurId(null); setMsg({ t: 'Formulário limpo.', err: false }); }}>Limpar</button>}
          {perfil && !bloqueada && <button className="btn" type="button" onClick={() => void guardar()}>Salvar</button>}
          <button className="btn p" type="button" onClick={() => baixarPdf(d)}>Gerar PDF</button>
        </div>
      </div>
    </main>
  );
}
