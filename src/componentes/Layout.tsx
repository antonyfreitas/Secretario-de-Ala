import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { perfil, sair } = useAuth();
  const nav = useNavigate();
  const [tema, setTema] = useState(document.documentElement.dataset.theme || 'dark');
  const alternar = () => {
    const t = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('tema', t);
    } catch {
      /* sem armazenamento */
    }
    setTema(t);
  };
  return (
    <>
      <header className="hd">
        <Link to="/">Ala Ipanema</Link>
        <span className="hdr">
          {perfil ? (
            <button className="back" type="button" onClick={async () => { await sair(); nav('/'); }}>Sair ({perfil.usuario})</button>
          ) : (
            <Link className="back" to="/entrar">Entrar</Link>
          )}
          <button className="back" type="button" onClick={alternar}>{tema === 'dark' ? 'Tema claro' : 'Tema escuro'}</button>
        </span>
      </header>
      <Outlet />
    </>
  );
}
