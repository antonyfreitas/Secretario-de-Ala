import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { configurado } from '../lib/supabase';

export default function Login() {
  const { entrar, perfil } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [u, setU] = useState('');
  const [s, setS] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    const r = await entrar(u, s);
    if (r) {
      await new Promise((ok) => setTimeout(ok, 800)); // freia tentativas repetidas
      setErro(r);
      setS('');
      setOcupado(false);
      return;
    }
    nav((loc.state as { de?: string } | null)?.de || '/', { replace: true });
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Entrar</h1>
      {perfil ? <p className="mut">Você já está logado como {perfil.usuario}.</p> : (
        <form className="col" onSubmit={enviar}>
          {!configurado && <p className="msg err">O servidor ainda não está configurado.</p>}
          <div><label htmlFor="u">Usuário</label><input id="u" type="text" autoComplete="username" autoCapitalize="none" value={u} onChange={(e) => setU(e.target.value)} required /></div>
          <div><label htmlFor="s">Senha</label><input id="s" type="password" autoComplete="current-password" value={s} onChange={(e) => setS(e.target.value)} required /></div>
          <p className="msg err" role="alert">{erro}</p>
          <button className="btn p" type="submit" disabled={ocupado || !configurado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        </form>
      )}
    </main>
  );
}
