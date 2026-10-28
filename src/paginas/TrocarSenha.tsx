import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function TrocarSenha() {
  const { perfil, recarregarPerfil, sair } = useAuth();
  const nav = useNavigate();
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [msg, setMsg] = useState({ t: '', err: false });
  const [ocupado, setOcupado] = useState(false);

  if (perfil && !perfil.trocar_senha) return <Navigate to="/" replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (nova.length < 12) return setMsg({ t: 'Use pelo menos 12 caracteres.', err: true });
    if (nova !== conf) return setMsg({ t: 'As senhas não conferem.', err: true });
    setOcupado(true);
    const { error } = await supabase!.rpc('trocar_minha_senha', { p_nova: nova });
    setOcupado(false);
    if (error) return setMsg({ t: error.message.charAt(0).toUpperCase() + error.message.slice(1) + '.', err: true });
    await recarregarPerfil();
    nav('/', { replace: true });
  };

  return (
    <main>
      <h1>Troque a sua senha</h1>
      <p className="mut">Por segurança, defina uma senha nova antes de continuar{perfil ? `, ${perfil.usuario}` : ''}. Depois disso, só o administrador da sua ala poderá redefini-la.</p>
      <form className="col" onSubmit={enviar}>
        <div><label htmlFor="n">Nova senha (12 caracteres ou mais)</label><input id="n" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required /></div>
        <div><label htmlFor="c">Repita a nova senha</label><input id="c" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} required /></div>
        <p className={'msg' + (msg.err ? ' err' : '')} role="alert">{msg.t}</p>
        <div className="acts">
          <button className="btn" type="button" onClick={async () => { await sair(); nav('/'); }}>Sair</button>
          <button className="btn p" type="submit" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar nova senha'}</button>
        </div>
      </form>
    </main>
  );
}
