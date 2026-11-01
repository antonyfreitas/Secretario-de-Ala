import { useState, type ChangeEvent } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const TEMAS: [string, string][] = [
  ['dark', 'Escuro'],
  ['azul', 'Claro azul'],
  ['areia', 'Claro areia'],
  ['lavanda', 'Claro lavanda'],
  ['cinza', 'Claro cinza'],
];

export default function Layout() {
  const { perfil, sair } = useAuth();
  const nav = useNavigate();
  const [tema, setTema] = useState(() => {
    const t = document.documentElement.dataset.theme || 'dark';
    return TEMAS.some(([k]) => k === t) ? t : 'azul';
  });
  const mudar = (e: ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value;
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
          <select aria-label="Tema de cores" value={tema} onChange={mudar}>
            {TEMAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </span>
      </header>
      <Outlet />
    </>
  );
}
