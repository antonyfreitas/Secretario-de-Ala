import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icone } from '../componentes/Icones';
import Logo from '../componentes/Logo';
import { useAuth } from '../lib/auth';
import { useManual } from '../lib/manual';

interface Item { to: string; titulo: string; desc: string; icone: string; alerta?: boolean }

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
      <div className="hero"><Logo tamanho={56} /><div><h1>{org?.nome ?? 'Secretário de Ala'}</h1>{org && <p className="sub">Secretário de Ala</p>}</div></div>
      <p className="mut">Ferramentas para o dia a dia da secretaria. O gerador de atas é aberto a todos e não guarda nada. Para salvar atas e ver o resto, entre com seu usuário.</p>
      <div className="seg segi" role="group" aria-label="Forma do menu">
        <button type="button" className={modo === 'lista' ? 'on3' : ''} onClick={() => trocar('lista')} aria-label="Ver em lista" title="Lista"><Icone nome="lista" /></button>
        <button type="button" className={modo === 'icones' ? 'on3' : ''} onClick={() => trocar('icones')} aria-label="Ver em ícones" title="Ícones"><Icone nome="grade" /></button>
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
