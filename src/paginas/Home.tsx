import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useManual } from '../lib/manual';

interface Item { to: string; titulo: string; desc: string; icone: string; alerta?: boolean }

const ICONES: Record<string, ReactNode> = {
  ata: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 12h5M9.5 15.5h5" /></>,
  calendario: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  atas: <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />,
  oradores: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
  entrevistas: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  manual: <><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>,
  conta: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  admin: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  entrar: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
};

function Icone({ nome }: { nome: string }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

export default function Home() {
  const { perfil, org } = useAuth();
  const man = useManual(perfil?.id);
  const [modo, setModo] = useState<'lista' | 'icones'>(() => {
    try { return localStorage.getItem('menu') === 'icones' ? 'icones' : 'lista'; } catch { return 'lista'; }
  });
  const trocar = (m: 'lista' | 'icones') => {
    setModo(m);
    try { localStorage.setItem('menu', m); } catch { /* sem armazenamento */ }
  };

  const itens: Item[] = [
    { to: '/gerador', titulo: 'Gerador de atas', icone: 'ata', desc: 'Preencha o programa da reunião sacramental e baixe o PDF em 1 folha. O que ficar vazio sai como linha para escrever à mão.' },
  ];
  if (perfil) {
    itens.push(
      { to: '/calendario', titulo: 'Calendário de domingos', icone: 'calendario', desc: 'Veja quais domingos já têm ata.' },
      { to: '/atas', titulo: 'Atas salvas', icone: 'atas', desc: 'Reabra, edite, duplique e faça backup.' },
      { to: '/oradores', titulo: 'Oradores', icone: 'oradores', desc: 'Quando cada pessoa discursou pela última vez, pelas atas salvas.' },
    );
    if (org?.entrevistas) itens.push({ to: '/entrevistas', titulo: 'Entrevistas', icone: 'entrevistas', desc: 'Quem foi entrevistado, quando e por quem. Pesquise antes das reuniões.' });
    itens.push(
      { to: '/manual', titulo: 'Atualizações do Manual', icone: 'manual', desc: man.texto, alerta: man.alerta },
      { to: '/conta', titulo: 'Minha conta', icone: 'conta', desc: 'Trocar a senha e apagar os dados deste aparelho.' },
    );
    if (perfil.role !== 'user') itens.push({ to: '/admin', titulo: 'Administração', icone: 'admin', desc: 'Usuários, alas, e-mail e monitor do Manual.' });
  } else {
    itens.push({ to: '/entrar', titulo: 'Entrar', icone: 'entrar', desc: 'Para salvar atas, ver o calendário e acompanhar o Manual.' });
  }

  return (
    <main>
      <h1>Secretaria</h1>
      <p className="mut">Ferramentas para o dia a dia da secretaria. O gerador de atas é aberto a todos e não guarda nada. Para salvar atas e ver o resto, entre com seu usuário.</p>
      <div className="seg" role="group" aria-label="Forma do menu">
        <button type="button" className={modo === 'lista' ? 'on3' : ''} onClick={() => trocar('lista')}>Lista</button>
        <button type="button" className={modo === 'icones' ? 'on3' : ''} onClick={() => trocar('icones')}>Ícones</button>
      </div>
      {modo === 'lista' ? (
        <div className="tools">
          {itens.map((i) => (
            <Link key={i.to} className={'tool on' + (i.alerta ? ' alert' : '')} to={i.to}><b>{i.titulo}</b><span>{i.desc}</span></Link>
          ))}
        </div>
      ) : (
        <div className="tiles">
          {itens.map((i) => (
            <Link key={i.to} className={'tile' + (i.alerta ? ' alert' : '')} to={i.to} title={i.desc}>
              <Icone nome={i.icone} />
              <b>{i.titulo}</b>
              {i.alerta && <i className="pin" aria-label="Precisa de atenção" />}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
