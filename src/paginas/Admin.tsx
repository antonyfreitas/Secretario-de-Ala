import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, type Perfil } from '../lib/auth';
import { fd, mesTxt } from '../lib/datas';
import { useManual } from '../lib/manual';
import { gerarSenha } from '../lib/senha';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const { perfil, nuvem, recarregarNuvem } = useAuth();
  const { auto } = useManual(perfil?.id);
  const [lista, setLista] = useState<Perfil[]>([]);
  const [msg, setMsg] = useState({ t: '', err: false });
  const [novo, setNovo] = useState({ usuario: '', nome: '', role: 'user', senha: gerarSenha() });
  const [mostrada, setMostrada] = useState('');
  const aviso = (t: string, err = false) => setMsg({ t, err });

  const carregar = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('id,usuario,nome,role,ativo').order('criado_em');
    if (error) aviso('Não foi possível listar os usuários.', true);
    else setLista((data ?? []) as Perfil[]);
  };
  useEffect(() => { void carregar(); }, []);

  const alternarAtivo = async (p: Perfil) => {
    if (!supabase || p.id === perfil?.id) return;
    const { error } = await supabase.from('profiles').update({ ativo: !p.ativo }).eq('id', p.id);
    if (error) return aviso('Não foi possível alterar o usuário.', true);
    aviso(`${p.usuario}: ${p.ativo ? 'desativado' : 'ativado'}.`);
    await carregar();
  };
  const alternarNuvem = async () => {
    if (!supabase) return;
    const { error } = await supabase.from('config').update({ valor: !nuvem, atualizado_em: new Date().toISOString() }).eq('chave', 'nuvem_ativa');
    if (error) return aviso('Não foi possível alterar a nuvem.', true);
    await recarregarNuvem();
    aviso(`Atas na nuvem: ${!nuvem ? 'ligadas' : 'desligadas'}.`);
  };
  const criar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.rpc('criar_usuario', { p_usuario: novo.usuario, p_nome: novo.nome, p_role: novo.role, p_senha: novo.senha });
    if (error) return aviso(`Não foi possível criar: ${error.message}.`, true);
    setMostrada(`Usuário ${novo.usuario.toLowerCase()} criado. Senha inicial (aparece só agora): ${novo.senha}`);
    setNovo({ usuario: '', nome: '', role: 'user', senha: gerarSenha() });
    aviso('Usuário criado. Passe a senha a ele; ele pode trocá-la em Minha conta.');
    await carregar();
  };
  const redefinir = async (p: Perfil) => {
    if (!supabase) return;
    const senha = gerarSenha();
    const { error } = await supabase.rpc('redefinir_senha', { p_usuario: p.usuario, p_senha: senha });
    if (error) return aviso(`Não foi possível redefinir: ${error.message}.`, true);
    setMostrada(`Nova senha de ${p.usuario} (aparece só agora): ${senha}`);
    aviso('Senha redefinida. As sessões abertas desse usuário foram encerradas.');
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Administração</h1>
      <p className="mut">Só administradores veem esta página. As permissões também são aplicadas no banco, não só na tela.</p>

      <fieldset><legend>Usuários</legend>
        {lista.map((p) => (
          <div className="ln" key={p.id}>
            <div><b>{p.usuario}</b> <span>{p.role === 'admin' ? 'administrador' : 'usuário'}{p.nome ? ` · ${p.nome}` : ''}{p.ativo ? '' : ' · desativado'}</span></div>
            <div className="acts">
              <button className="btn sw" type="button" onClick={() => void redefinir(p)}>Nova senha</button>
              <button className="btn sw" type="button" disabled={p.id === perfil?.id} onClick={() => void alternarAtivo(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
            </div>
          </div>
        ))}
        {mostrada && <p className="card">{mostrada}</p>}
      </fieldset>

      <fieldset><legend>Novo usuário</legend>
        <form className="col" onSubmit={criar}>
          <div><label htmlFor="nu">Usuário (letras minúsculas, números, ponto ou traço)</label><input id="nu" type="text" autoCapitalize="none" autoComplete="off" value={novo.usuario} onChange={(e) => setNovo({ ...novo, usuario: e.target.value })} required /></div>
          <div><label htmlFor="nn">Nome (opcional)</label><input id="nn" type="text" autoComplete="off" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
          <div><label htmlFor="nr">Papel</label><select id="nr" value={novo.role} onChange={(e) => setNovo({ ...novo, role: e.target.value })}><option value="user">Usuário</option><option value="admin">Administrador</option></select></div>
          <div><label htmlFor="ns">Senha inicial</label><input id="ns" type="text" autoComplete="off" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} required minLength={12} /></div>
          <div className="acts"><button className="btn" type="button" onClick={() => setNovo({ ...novo, senha: gerarSenha() })}>Gerar outra senha</button><button className="btn p" type="submit">Criar usuário</button></div>
        </form>
      </fieldset>

      <fieldset><legend>Atas na nuvem</legend>
        <p className="mut">Quando ligado, todos os usuários ativos veem e editam as mesmas atas, guardadas no servidor. Isso coloca nomes de membros fora do aparelho: ligue só com a autorização do bispo e conforme as regras da Igreja. Desligar não apaga o que já foi enviado.</p>
        <div className="ln"><span>Estado: <b>{nuvem ? 'ligadas' : 'desligadas'}</b></span><button className="btn sw" type="button" onClick={() => void alternarNuvem()}>{nuvem ? 'Desligar' : 'Ligar'}</button></div>
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
