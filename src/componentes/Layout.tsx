import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icone } from './Icones';
import Logo from './Logo';

export default function Layout() {
  const { perfil, sair } = useAuth();
  const nav = useNavigate();
  const [tema, setTema] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'areia'));
  const alternar = () => {
    const t = tema === 'dark' ? 'areia' : 'dark';
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
        <Link className="marca" to="/"><Logo tamanho={28} /><span>Secretário de Ala</span></Link>
        <span className="hdr">
          {perfil ? (
            <button className="back" type="button" onClick={async () => { await sair(); nav('/'); }}>Sair ({perfil.usuario})</button>
          ) : (
            <Link className="back" to="/entrar">Entrar</Link>
          )}
          <button className="ib" type="button" onClick={alternar} aria-label={tema === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'} title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            <Icone nome={tema === 'dark' ? 'sol' : 'lua'} />
          </button>
        </span>
      </header>
      <Outlet />
    </>
  );
}
