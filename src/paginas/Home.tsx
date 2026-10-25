import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useManual } from '../lib/manual';

function Ferramenta({ to, titulo, desc, alerta }: { to: string; titulo: string; desc: string; alerta?: boolean }) {
  return (
    <Link className={'tool on' + (alerta ? ' alert' : '')} to={to}>
      <b>{titulo}</b>
      <span>{desc}</span>
    </Link>
  );
}

export default function Home() {
  const { perfil } = useAuth();
  const man = useManual(perfil?.id);
  return (
    <main>
      <h1>Secretaria</h1>
      <p className="mut">Ferramentas para o dia a dia da secretaria. O gerador de atas é aberto a todos e não guarda nada. Para salvar atas e ver o resto, entre com seu usuário.</p>
      <div className="tools">
        <Ferramenta to="/gerador" titulo="Gerador de atas" desc="Preencha o programa da reunião sacramental e baixe o PDF em 1 folha. O que ficar vazio sai como linha para escrever à mão." />
        {perfil ? (
          <>
            <Ferramenta to="/calendario" titulo="Calendário de domingos" desc="Veja quais domingos já têm ata." />
            <Ferramenta to="/atas" titulo="Atas salvas" desc="Reabra, edite, duplique e faça backup." />
            <Ferramenta to="/manual" titulo="Atualizações do Manual" desc={man.texto} alerta={man.alerta} />
            <Ferramenta to="/conta" titulo="Minha conta" desc="Trocar a senha e apagar os dados deste aparelho." />
            {perfil.role === 'admin' && <Ferramenta to="/admin" titulo="Administração" desc="Usuários, nuvem e monitor do Manual." />}
          </>
        ) : (
          <Ferramenta to="/entrar" titulo="Entrar" desc="Para salvar atas, ver o calendário e acompanhar o Manual." />
        )}
      </div>
    </main>
  );
}
