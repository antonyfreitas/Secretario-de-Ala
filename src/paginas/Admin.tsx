import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ROTULO_PAPEL, useAuth, type Perfil } from '../lib/auth';
import { fd, mesTxt } from '../lib/datas';
import { useManual } from '../lib/manual';
import { listarDestinatarios, listarOrgs, type Destinatario, type Org } from '../lib/nuvem';
import { gerarSenha } from '../lib/senha';
import { supabase } from '../lib/supabase';

type Edicao = { id: string; usuario: string; nome: string; role: string; org: string };

export default function Admin() {
  const { perfil, recarregarNuvem } = useAuth();
  const global = perfil?.role === 'admin';
  const { auto } = useManual(perfil?.id);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [lista, setLista] = useState<Perfil[]>([]);
  const [dest, setDest] = useState<Destinatario[]>([]);
  const [orgSel, setOrgSel] = useState(perfil?.org_id ?? '');
  const [msg, setMsg] = useState({ t: '', err: false });
  const [novaOrg, setNovaOrg] = useState('');
  const [novo, setNovo] = useState({ usuario: '', nome: '', role: 'user', org: perfil?.org_id ?? '', senha: gerarSenha() });
  const [novoDest, setNovoDest] = useState({ nome: '', papel: 'bispo', email: '', whatsapp: '' });
  const [mostrada, setMostrada] = useState('');
  const [ed, setEd] = useState<Edicao | null>(null);
  const [armado, setArmado] = useState<string | null>(null);
  const aviso = (t: string, err = false) => setMsg({ t, err });
  const nomeOrg = (id: string | null) => orgs.find((o) => o.id === id)?.nome ?? '';
  const papeis = global ? ['user', 'org_admin', 'admin'] : ['user', 'org_admin'];

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

  const alternarNuvem = async (o: Org) => {
    if (!supabase) return;
    const { error } = await supabase.from('organizacoes').update({ nuvem_ativa: !o.nuvem }).eq('id', o.id);
    if (error) return aviso('Não foi possível alterar as atas na nuvem.', true);
    await carregarOrgs();
    if (o.id === perfil?.org_id) await recarregarNuvem();
    aviso(`${o.nome}: atas na nuvem ${!o.nuvem ? 'ligadas' : 'desligadas'}.`);
  };
  const criarOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from('organizacoes').insert({ nome: novaOrg.trim() });
    if (error) return aviso('Não foi possível criar (o nome já existe ou é curto demais).', true);
    setNovaOrg('');
    aviso('Ala criada. As atas na nuvem começam desligadas.');
    await carregarOrgs();
  };
  const excluirOrg = async (o: Org) => {
    if (!supabase) return;
    if (armado !== o.id) { setArmado(o.id); setTimeout(() => setArmado((a) => (a === o.id ? null : a)), 5000); return; }
    setArmado(null);
    const { error } = await supabase.from('organizacoes').delete().eq('id', o.id);
    if (error) return aviso('Só dá para excluir uma ala sem usuários e sem atas.', true);
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
    setMostrada(`Usuário ${novo.usuario.toLowerCase()} criado. Senha inicial (aparece só agora): ${novo.senha}`);
    setNovo({ ...novo, usuario: '', nome: '', senha: gerarSenha() });
    aviso('Usuário criado. Passe a senha a ele; ele pode trocá-la em Minha conta.');
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
    setMostrada(`Nova senha de ${p.usuario} (aparece só agora): ${senha}`);
    aviso('Senha redefinida. As sessões abertas desse usuário foram encerradas.');
  };
  const excluir = async (p: Perfil) => {
    if (!supabase) return;
    if (armado !== p.id) { setArmado(p.id); setTimeout(() => setArmado((a) => (a === p.id ? null : a)), 5000); return; }
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
        {orgs.map((o) => (
          <div className="ln" key={o.id}>
            <div><b>{o.nome}</b> <span>atas na nuvem: {o.nuvem ? 'ligadas' : 'desligadas'}</span></div>
            <div className="acts">
              <button className="btn sw" type="button" onClick={() => void alternarNuvem(o)}>{o.nuvem ? 'Desligar nuvem' : 'Ligar nuvem'}</button>
              {global && <button className="btn sw" type="button" onClick={() => void excluirOrg(o)}>{armado === o.id ? 'Confirmar: excluir' : 'Excluir'}</button>}
            </div>
          </div>
        ))}
        <p className="sub">Ligar a nuvem guarda nomes de membros no servidor e todos os usuários da ala veem as mesmas atas. Ligue só com a autorização do bispo e conforme as regras da Igreja. Desligar não apaga o que já foi enviado.</p>
        {global && (
          <form className="col" onSubmit={criarOrg}>
            <div><label htmlFor="no">Nova ala</label><input id="no" type="text" autoComplete="off" value={novaOrg} onChange={(e) => setNovaOrg(e.target.value)} required minLength={2} /></div>
            <button className="btn" type="submit">Criar ala</button>
          </form>
        )}
      </fieldset>

      <fieldset><legend>Usuários</legend>
        {lista.map((p) => (ed && ed.id === p.id ? (
          <form className="col" key={p.id} onSubmit={(e) => void salvarEdicao(e)}>
            <div><label htmlFor="eu">Usuário (é o login)</label><input id="eu" type="text" autoCapitalize="none" autoComplete="off" value={ed.usuario} onChange={(e) => setEd({ ...ed, usuario: e.target.value })} required /></div>
            <div><label htmlFor="en">Nome</label><input id="en" type="text" autoComplete="off" value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
            {campoPapel(ed.role, (v) => setEd({ ...ed, role: v }), 'er')}
            {global && campoOrg(ed.org, (v) => setEd({ ...ed, org: v }), 'eo')}
            <div className="acts"><button className="btn" type="button" onClick={() => setEd(null)}>Cancelar</button><button className="btn p" type="submit">Salvar alterações</button></div>
          </form>
        ) : (
          <div className="ln" key={p.id}>
            <div><b>{p.usuario}</b> <span>{ROTULO_PAPEL[p.role]}{global && p.org_id ? ` · ${nomeOrg(p.org_id)}` : ''}{p.nome ? ` · ${p.nome}` : ''}{p.ativo ? '' : ' · desativado'}</span></div>
            <div className="acts">
              <button className="btn sw" type="button" onClick={() => setEd({ id: p.id, usuario: p.usuario, nome: p.nome, role: p.role, org: p.org_id ?? '' })}>Editar</button>
              <button className="btn sw" type="button" onClick={() => void redefinir(p)}>Nova senha</button>
              <button className="btn sw" type="button" disabled={p.id === perfil?.id} onClick={() => void alternarAtivo(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
              <button className="btn sw" type="button" disabled={p.id === perfil?.id} onClick={() => void excluir(p)}>{armado === p.id ? 'Confirmar: excluir de vez' : 'Excluir'}</button>
            </div>
          </div>
        )))}
        {mostrada && <p className="card">{mostrada}</p>}
      </fieldset>

      <fieldset><legend>Novo usuário</legend>
        <form className="col" onSubmit={criar}>
          <div><label htmlFor="nu">Usuário (letras minúsculas, números, ponto ou traço)</label><input id="nu" type="text" autoCapitalize="none" autoComplete="off" value={novo.usuario} onChange={(e) => setNovo({ ...novo, usuario: e.target.value })} required /></div>
          <div><label htmlFor="nn">Nome (opcional)</label><input id="nn" type="text" autoComplete="off" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
          {campoPapel(novo.role, (v) => setNovo({ ...novo, role: v }), 'nr')}
          {global && campoOrg(novo.org, (v) => setNovo({ ...novo, org: v }), 'no2')}
          <div><label htmlFor="ns">Senha inicial</label><input id="ns" type="text" autoComplete="off" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} required minLength={12} /></div>
          <div className="acts"><button className="btn" type="button" onClick={() => setNovo({ ...novo, senha: gerarSenha() })}>Gerar outra senha</button><button className="btn p" type="submit">Criar usuário</button></div>
        </form>
      </fieldset>

      <fieldset><legend>Destinatários da cópia (bispado)</legend>
        {global && orgs.length > 1 && <div className="g"><div className="wide">{campoOrg(orgSel, setOrgSel, 'od')}</div></div>}
        {dest.map((d) => (
          <div className="ln" key={d.id}>
            <div><b>{d.nome}</b> <span>{d.papel}{d.email ? ` · ${d.email}` : ''}{d.whatsapp ? ` · WhatsApp ${d.whatsapp}` : ''}</span></div>
            <button className="btn sw" type="button" onClick={() => void delDest(d)}>Remover</button>
          </div>
        ))}
        {dest.length === 0 && <p className="mut">Nenhum destinatário ainda.</p>}
        <form className="col" onSubmit={addDest}>
          <div><label htmlFor="dn">Nome</label><input id="dn" type="text" autoComplete="off" value={novoDest.nome} onChange={(e) => setNovoDest({ ...novoDest, nome: e.target.value })} required minLength={2} /></div>
          <div><label htmlFor="dp">Função</label><select id="dp" value={novoDest.papel} onChange={(e) => setNovoDest({ ...novoDest, papel: e.target.value })}><option value="bispo">Bispo</option><option value="conselheiro">Conselheiro</option><option value="secretario">Secretário</option><option value="outro">Outro</option></select></div>
          <div><label htmlFor="de">E-mail (opcional)</label><input id="de" type="text" inputMode="email" autoCapitalize="none" autoComplete="off" value={novoDest.email} onChange={(e) => setNovoDest({ ...novoDest, email: e.target.value })} /></div>
          <div><label htmlFor="dw">WhatsApp (opcional, com DDI e DDD)</label><input id="dw" type="text" inputMode="numeric" autoComplete="off" placeholder="5551999999999" value={novoDest.whatsapp} onChange={(e) => setNovoDest({ ...novoDest, whatsapp: e.target.value })} /></div>
          <button className="btn" type="submit">Adicionar destinatário</button>
        </form>
        <p className="sub">E-mails e telefones ficam no servidor, visíveis só para os usuários da ala. Cadastre só quem precisa receber a cópia.</p>
      </fieldset>

      <fieldset><legend>Monitor do Manual</legend>
        {auto
          ? <p>Última verificação: {fd(auto.verificado)}. Atualização mais recente: {mesTxt(auto.ultimoMes)}.</p>
          : <p className="mut">Sem dados do monitor ainda.</p>}
      </fieldset>
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
    </main>
  );
}
