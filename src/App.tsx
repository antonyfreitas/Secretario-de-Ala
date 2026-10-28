import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './componentes/Layout';
import { useAuth } from './lib/auth';
import Admin from './paginas/Admin';
import Atas from './paginas/Atas';
import Calendario from './paginas/Calendario';
import Conta from './paginas/Conta';
import Gerador from './paginas/Gerador';
import Home from './paginas/Home';
import Login from './paginas/Login';
import ManualPage from './paginas/ManualPage';
import TrocarSenha from './paginas/TrocarSenha';

function Protegida({ admin }: { admin?: boolean }) {
  const { carregando, perfil } = useAuth();
  const loc = useLocation();
  if (carregando) return <main><p className="mut">Carregando…</p></main>;
  if (!perfil) return <Navigate to="/entrar" replace state={{ de: loc.pathname + loc.search }} />;
  if (perfil.trocar_senha && loc.pathname !== '/trocar-senha') return <Navigate to="/trocar-senha" replace />;
  if (admin && perfil.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

/** A chave da navegação reinicia o formulário a cada visita. */
function GeradorRota() {
  return <Gerador key={useLocation().key} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/gerador" element={<GeradorRota />} />
        <Route path="/entrar" element={<Login />} />
        <Route element={<Protegida />}>
          <Route path="/atas" element={<Atas />} />
          <Route path="/atas/:id" element={<GeradorRota />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/manual" element={<ManualPage />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/trocar-senha" element={<TrocarSenha />} />
        </Route>
        <Route element={<Protegida admin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<main><h1>Página não encontrada</h1><Link className="back" to="/">‹ Início</Link></main>} />
      </Route>
    </Routes>
  );
}
