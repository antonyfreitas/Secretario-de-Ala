import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../componentes/Modal';
import { ROTULO_PAPEL, useAuth, type Perfil } from '../lib/auth';
import { listarDestinatarios, listarOrgs, type Destinatario, type Org } from '../lib/nuvem';
import { gerarSenha } from '../lib/senha';
import { supabase } from '../lib/supabase';

type Edicao = { id: string; usuario: string; nome: string; role: string; org: string };

export default function Admin() {
  const { perfil, recarregarNuvem } = useAuth();
  const global = perfil?.role === 'admin';
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [lista, setLista] = useState<Perfil[]>([]);
  const [dest, setDest] = useState<Destinatario[]>([]);
  const [orgSel, setOrgSel] = useState(perfil?.org_id ?? '');
  const [msg, setMsg] = useState({ t: '', err: false });
  const [novaOrg, setNovaOrg] = useState('');
  const [novo, setNovo] = useState({ usuario: '', nome: '', role: 'user', org: perfil?.org_id ?? '', senha: gerarSenha() });
  const [novoDest, setNovoDest] = useState({ nome: '', papel: 'bispo', email: '', whatsapp: '' });
  const [modelo, setModelo] = useState({ assunto: '', mensagem: '' });
  const [mOrg, setMOrg] = useState(false);
  const [mUser, setMUser] = useState(false);
  const [mDest, setMDest] = useState(false);
  const [mostrada, setMostrada] = useState<{ texto: string; senha: string } | null>(null);
  const [ed, setEd] = useState<Edicao | null>(null);
  const [armado, setArmado] = useState<string | null>(null);
  const aviso = (t: string, err = false) => {
    setMsg({ t, err });
    window.setTimeout(() => setMsg((m) => (m.t === t ? { t: '', err: false } : m)), 8000);
  };
  const nomeOrg = (id: string | null) => orgs.find((o) => o.id === id)?.nome ?? '';
  const qtd = (o: Org) => lista.filter((p) => p.org_id === o.id).length;
  const papeis = global ? ['user', 'org_admin', 'admin'] : ['user', 'org_admin'];
  const armar = (k: string) => { setArmado(k); window.setTimeout(() => setArmado((a) => (a === k ? null : a)), 5000); };

  const carregarOrgs = async () => setOrgs(await listarOrgs());
  const carregarUsuarios = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('id,usuario,nome,role,ativo,org_id').order('criado_em');
    if (error) aviso('Não foi possível listar os usuários.', true);
    else setLista((data ?? []) as Perfil[]);
  };
  const carregarDest = async (o: string) => setDest(await listarDestinatarios(o));
  useEffect(() => { void carregarOrgs(); void carregarUsuarios(); }, []);
  useEffect(() => { if (orgSel) void carregarDest(orgSel); }, [orgSel]);
  useEffect(() => {
    const o = orgs.find((x) => x.id === orgSel);
    if (o) setModelo({ assunto: o.emailAssunto ?? '', mensagem: o.emailMensagem ?? '' });
  }, [orgs, orgSel]);

  const alternar = async (o: Org, campo: 'nuvem_ativa' | 'email_ativo' | 'entrevistas_ativo', atual: boolean, rotulo: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('organizacoes').update({ [campo]: !atual }).eq('id', o.id);
    if (error) return aviso(`Não foi possível alterar: ${rotulo}.`, true);
    await carregarOrgs();
    if (o.id === perfil?.org_id) await recarregarNuvem();
    aviso(`${o.nome}: ${rotulo} ${!atual ? 'ligado' : 'desligado'}.`);
  };
  const salvarModelo = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !orgSel) return;
    const { error } = await supabase.from('organizacoes').update({ email_assunto: modelo.assunto.trim() || null, email_mensagem: modelo.mensagem.trim() || null }).eq('id', orgSel);
    if (error) return aviso('Não foi possível salvar o modelo.', true);
    await carregarOrgs();
    aviso('Modelo do e-mail salvo.');
  };
  const previa = (t: string) => t.split('{ala}').join(nomeOrg(orgSel)).split('{data}').join('25/10/2026').split('{usuario}').join(perfil?.usuario ?? '');

  const criarOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from('organizacoes').insert({ nome: novaOrg.trim() });
    if (error) return aviso('Não foi possível criar (o nome já existe ou é curto demais).', true);
    setNovaOrg('');
    setMOrg(false);
    aviso('Ala criada. Os recursos começam desligados.');
    await carregarOrgs();
  };
  const excluirOrg = async (o: Org) => {
    if (!supabase) return;
    const n = qtd(o);
    if (n > 0) return aviso(`Não dá para excluir ${o.nome}: ainda há ${n} ${n === 1 ? 'usuário vinculado' : 'usuários vinculados'}. Mude-os de ala (Editar) ou exclua-os antes.`, true);
    if (armado !== o.id) return armar(o.id);
    setArmado(null);
    const { error } = await supabase.from('organizacoes').delete().eq('id', o.id);
    if (error) return aviso(`Não foi possível excluir ${o.nome}: ela ainda tem atas ou outros dados vinculados.`, true);
    aviso(`${o.nome} excluída.`);
    await carregarOrgs();
  };

  const alternarAtivo = async (p: Perfil) => {
    if (!supabase || p.id === perfil?.id) return;
    const { error } = await supabase.from('profiles').update({ ativo: !p.ativo }).eq('id', p.id);
    if (error) return aviso('Não foi possível alterar o usuário.', true);
    aviso(`${p.usuario}: ${p.ativo ? 'desativado' : 'ativado'}.`);
    await carregarUsuarios();
  };
  const criar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.rpc('criar_usuario', { p_usuario: novo.usuario, p_nome: novo.nome, p_role: novo.role, p_senha: novo.senha, p_org: global ? novo.org || null : null });
    if (error) return aviso(`Não foi possível criar: ${error.message}.`, true);
    setMostrada({ texto: `Usuário ${novo.usuario.toLowerCase()} criado. Senha inicial:`, senha: novo.senha });
    setNovo({ ...novo, usuario: '', nome: '', senha: gerarSenha() });
    setMUser(false);
    await carregarUsuarios();
  };
  const salvarEdicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !ed) return;
    const { error } = await supabase.rpc('editar_usuario', { p_id: ed.id, p_usuario: ed.usuario, p_nome: ed.nome, p_role: ed.role, p_org: global ? ed.org || null : null });
    if (error) return aviso(`Não foi possível salvar: ${error.message}.`, true);
    setEd(null);
    aviso(ed.id === perfil?.id ? 'Atualizado. Entre de novo para a tela mostrar as mudanças.' : 'Usuário atualizado. O login é o nome de usuário em minúsculas.');
    await carregarUsuarios();
  };
  const redefinir = async (p: Perfil) => {
    if (!supabase) return;
    const senha = gerarSenha();
    const { error } = await supabase.rpc('redefinir_senha', { p_usuario: p.usuario, p_senha: senha });
    if (error) return aviso(`Não foi possível redefinir: ${error.message}.`, true);
    setMostrada({ texto: `Nova senha de ${p.usuario}:`, senha });
  };
  const excluir = async (p: Perfil) => {
    if (!supabase) return;
    if (armado !== p.id) return armar(p.id);
    setArmado(null);
    const { error } = await supabase.rpc('excluir_usuario', { p_id: p.id });
    if (error) return aviso(`Não foi possível excluir: ${error.message}.`, true);
    aviso(`${p.usuario} foi excluído de vez. As atas dele continuam e passam a ser suas.`);
    await carregarUsuarios();
  };

  const addDest = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !orgSel) return;
    const zap = novoDest.whatsapp.replace(/\D/g, '');
    const { error } = await supabase.from('destinatarios').insert({ org_id: orgSel, nome: novoDest.nome.trim(), papel: novoDest.papel, email: novoDest.email.trim() || null, whatsapp: zap || null });
    if (error) return aviso('Não foi possível adicionar. Confira o e-mail e o WhatsApp (só números, com DDI e DDD, ex.: 5551999999999).', true);
    setNovoDest({ nome: '', papel: 'bispo', email: '', whatsapp: '' });
    setMDest(false);
    aviso('Destinatário adicionado.');
    await carregarDest(orgSel);
  };
  const delDest = async (d: Destinatario) => {
    if (!supabase) return;
    const { error } = await supabase.from('destinatarios').delete().eq('id', d.id);
    if (error) return aviso('Não foi possível remover.', true);
    await carregarDest(orgSel);
  };

  const campoOrg = (valor: string, aoMudar: (v: string) => void, id: string) => (
    <div><label htmlFor={id}>Ala</label><select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
  );
  const campoPapel = (valor: string, aoMudar: (v: string) => void, id: string) => (
    <div><label htmlFor={id}>Papel</label><select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)}>{papeis.map((r) => <option key={r} value={r}>{ROTULO_PAPEL[r]}</option>)}</select></div>
  );

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Administração</h1>
      <p className="mut">{global ? 'Você é administrador geral: vê todas as alas.' : 'Você administra a sua ala.'} As permissões também são aplicadas no banco, não só na tela.</p>

      <fieldset><legend>{global ? 'Alas' : 'Minha ala'}</legend>
        {global && <div className="acts"><button className="btn peq" type="button" onClick={() => setMOrg(true)}>+ Nova ala</button></div>}
        {orgs.map((o) => (
          <div className="ln" key={o.id}>
            <div><b>{o.nome}</b> <span>{qtd(o)} {qtd(o) === 1 ? 'usuário' : 'usuários'}</span></div>
            <div className="acts">
              <button className={'btn sw' + (o.nuvem ? ' on2' : '')} type="button" aria-pressed={o.nuvem} onClick={() => void alternar(o, 'nuvem_ativa', o.nuvem, 'atas na nuvem')}>Nuvem</button>
              <button className={'btn sw' + (o.emailAtivo ? ' on2' : '')} type="button" aria-pressed={o.emailAtivo} onClick={() => void alternar(o, 'email_ativo', o.emailAtivo, 'envio por e-mail')}>E-mail</button>
              <button className={'btn sw' + (o.entrevistasAtivo ? ' on2' : '')} type="button" aria-pressed={o.entrevistasAtivo} onClick={() => void alternar(o, 'entrevistas_ativo', o.entrevistasAtivo, 'entrevistas')}>Entrevistas</button>
              {global && <button className="btn sw perigo" type="button" onClick={() => void excluirOrg(o)}>{armado === o.id ? 'Confirmar' : 'Excluir'}</button>}
            </div>
          </div>
        ))}
        <p className="sub">Botão preenchido = ligado. Nuvem: atas compartilhadas na ala. E-mail: envio da ata aos destinatários. Entrevistas: registro de entrevistas. Ligar guarda dados fora do aparelho: só com a autorização do bispo e conforme as regras da Igreja.</p>
      </fieldset>

      <fieldset><legend>Usuários</legend>
        <div className="acts"><button className="btn peq" type="button" onClick={() => setMUser(true)}>+ Novo usuário</button></div>
        {lista.map((p) => (
          <div className="ln" key={p.id}>
            <div><b>{p.usuario}</b> <span>{ROTULO_PAPEL[p.role]}{global && p.org_id ? ` · ${nomeOrg(p.org_id)}` : ''}{p.nome ? ` · ${p.nome}` : ''}{p.ativo ? '' : ' · desativado'}</span></div>
            <div className="acts">
              <button className="btn sw" type="button" onClick={() => setEd({ id: p.id, usuario: p.usuario, nome: p.nome, role: p.role, org: p.org_id ?? '' })}>Editar</button>
              <button className="btn sw" type="button" onClick={() => void redefinir(p)}>Nova senha</button>
              <button className="btn sw" type="button" disabled={p.id === perfil?.id} onClick={() => void alternarAtivo(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
              <button className="btn sw perigo" type="button" disabled={p.id === perfil?.id} onClick={() => void excluir(p)}>{armado === p.id ? 'Confirmar' : 'Excluir'}</button>
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset><legend>Destinatários da cópia (bispado)</legend>
        {global && orgs.length > 1 && <div className="g"><div className="wide">{campoOrg(orgSel, setOrgSel, 'od')}</div></div>}
        <div className="acts"><button className="btn peq" type="button" onClick={() => setMDest(true)}>+ Adicionar</button></div>
        {dest.map((d) => (
          <div className="ln" key={d.id}>
            <div><b>{d.nome}</b> <span>{d.papel}{d.email ? ` · ${d.email}` : ''}{d.whatsapp ? ` · WhatsApp ${d.whatsapp}` : ''}</span></div>
            <button className="btn sw perigo" type="button" onClick={() => void delDest(d)}>Remover</button>
          </div>
        ))}
        {dest.length === 0 && <p className="mut">Nenhum destinatário ainda.</p>}
        <p className="sub">E-mails e telefones ficam no servidor, visíveis só para os usuários da ala. Cadastre só quem precisa receber a cópia.</p>
      </fieldset>

      <fieldset><legend>Modelo do e-mail da ata</legend>
        {global && orgs.length > 1 && <div className="g"><div className="wide">{campoOrg(orgSel, setOrgSel, 'om')}</div></div>}
        <form className="col" onSubmit={salvarModelo}>
          <div><label htmlFor="ma">Assunto</label><input id="ma" type="text" autoComplete="off" maxLength={150} placeholder="Ata da reunião sacramental de {data} - {ala}" value={modelo.assunto} onChange={(e) => setModelo({ ...modelo, assunto: e.target.value })} /></div>
          <div><label htmlFor="mm">Mensagem</label><textarea id="mm" maxLength={2000} placeholder="Segue em anexo a ata da reunião sacramental de {data} da {ala}.&#10;&#10;Enviada por {usuario}." value={modelo.mensagem} onChange={(e) => setModelo({ ...modelo, mensagem: e.target.value })} /></div>
          <p className="sub">Use {'{ala}'}, {'{data}'} e {'{usuario}'}. Em branco, vale o modelo padrão. Prévia do assunto: {previa(modelo.assunto || 'Ata da reunião sacramental de {data} - {ala}')}</p>
          <div className="acts"><button className="btn peq" type="submit">Salvar modelo</button></div>
        </form>
      </fieldset>

      <Modal aberto={mOrg} titulo="Nova ala" aoFechar={() => setMOrg(false)}>
        <form className="col" onSubmit={criarOrg}>
          <div><label htmlFor="no">Nome da ala (ex.: Ala Centro)</label><input id="no" type="text" autoComplete="off" value={novaOrg} onChange={(e) => setNovaOrg(e.target.value)} required minLength={2} maxLength={80} /></div>
          <p className="sub">A ala nasce com nuvem, e-mail e entrevistas desligados. Depois, cadastre os usuários dela.</p>
          <div className="acts"><button className="btn" type="button" onClick={() => setMOrg(false)}>Cancelar</button><button className="btn p" type="submit">Criar ala</button></div>
        </form>
      </Modal>

      <Modal aberto={mUser} titulo="Novo usuário" aoFechar={() => setMUser(false)}>
        <form className="col" onSubmit={criar}>
          <div><label htmlFor="nu">Usuário (letras minúsculas, números, ponto ou traço)</label><input id="nu" type="text" autoCapitalize="none" autoComplete="off" value={novo.usuario} onChange={(e) => setNovo({ ...novo, usuario: e.target.value })} required /></div>
          <div><label htmlFor="nn">Nome (opcional)</label><input id="nn" type="text" autoComplete="off" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
          {campoPapel(novo.role, (v) => setNovo({ ...novo, role: v }), 'nr')}
          {global && campoOrg(novo.org, (v) => setNovo({ ...novo, org: v }), 'no2')}
          <div><label htmlFor="ns">Senha inicial (ele troca no primeiro acesso)</label><input id="ns" type="text" autoComplete="off" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} required minLength={8} /></div>
          <div className="acts"><button className="btn" type="button" onClick={() => setNovo({ ...novo, senha: gerarSenha() })}>Gerar outra senha</button></div>
          <div className="acts"><button className="btn" type="button" onClick={() => setMUser(false)}>Cancelar</button><button className="btn p" type="submit">Criar usuário</button></div>
        </form>
      </Modal>

      <Modal aberto={!!ed} titulo="Editar usuário" aoFechar={() => setEd(null)}>
        {ed && (
          <form className="col" onSubmit={salvarEdicao}>
            <div><label htmlFor="eu">Usuário (é o login)</label><input id="eu" type="text" autoCapitalize="none" autoComplete="off" value={ed.usuario} onChange={(e) => setEd({ ...ed, usuario: e.target.value })} required /></div>
            <div><label htmlFor="en">Nome</label><input id="en" type="text" autoComplete="off" value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
            {campoPapel(ed.role, (v) => setEd({ ...ed, role: v }), 'er')}
            {global && campoOrg(ed.org, (v) => setEd({ ...ed, org: v }), 'eo')}
            <div className="acts"><button className="btn" type="button" onClick={() => setEd(null)}>Cancelar</button><button className="btn p" type="submit">Salvar</button></div>
          </form>
        )}
      </Modal>

      <Modal aberto={mDest} titulo="Novo destinatário" aoFechar={() => setMDest(false)}>
        <form className="col" onSubmit={addDest}>
          <div><label htmlFor="dn">Nome</label><input id="dn" type="text" autoComplete="off" value={novoDest.nome} onChange={(e) => setNovoDest({ ...novoDest, nome: e.target.value })} required minLength={2} /></div>
          <div><label htmlFor="dp">Função</label><select id="dp" value={novoDest.papel} onChange={(e) => setNovoDest({ ...novoDest, papel: e.target.value })}><option value="bispo">Bispo</option><option value="conselheiro">Conselheiro</option><option value="secretario">Secretário</option><option value="outro">Outro</option></select></div>
          <div><label htmlFor="de">E-mail (opcional)</label><input id="de" type="text" inputMode="email" autoCapitalize="none" autoComplete="off" value={novoDest.email} onChange={(e) => setNovoDest({ ...novoDest, email: e.target.value })} /></div>
          <div><label htmlFor="dw">WhatsApp (opcional, com DDI e DDD)</label><input id="dw" type="text" inputMode="numeric" autoComplete="off" placeholder="5551999999999" value={novoDest.whatsapp} onChange={(e) => setNovoDest({ ...novoDest, whatsapp: e.target.value })} /></div>
          <div className="acts"><button className="btn" type="button" onClick={() => setMDest(false)}>Cancelar</button><button className="btn p" type="submit">Adicionar</button></div>
        </form>
      </Modal>

      <Modal aberto={!!mostrada} titulo="Senha gerada" aoFechar={() => setMostrada(null)}>
        {mostrada && (
          <>
            <p>{mostrada.texto}</p>
            <p className="senha">{mostrada.senha}</p>
            <p className="sub">Passe a senha à pessoa agora: ela não aparece de novo. No primeiro acesso, ela terá de trocar por uma própria.</p>
            <div className="acts">
              <button className="btn" type="button" onClick={() => { void navigator.clipboard?.writeText(mostrada.senha); aviso('Senha copiada.'); }}>Copiar senha</button>
              <button className="btn p" type="button" onClick={() => setMostrada(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>

      {msg.t && <div className={'toast' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</div>}
    </main>
  );
}
