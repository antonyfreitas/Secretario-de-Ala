import { Link } from 'react-router-dom';
import { ADMINISTRADORES, AVISO } from '../dados/sobre';

export default function Sobre() {
  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Sobre</h1>
      <p className="aviso">{AVISO}</p>

      <h2>O que é</h2>
      <p>Ferramenta de apoio ao trabalho do secretário de ala: gerar a ata da reunião sacramental em PDF, acompanhar o calendário de domingos e ajudar no estudo do Manual Geral. Foi criada por membros, sem vínculo oficial com a Igreja.</p>

      <h2>Dados e privacidade</h2>
      <p>O gerador de atas é aberto e não guarda nada no servidor. Para salvar atas e usar os demais recursos, cada pessoa entra com um usuário criado pelo administrador. Os recursos que guardam dados fora do aparelho (atas na nuvem, entrevistas) ficam desligados em cada ala até o bispo autorizar. Não há dados de membros além do que a própria ata contém.</p>

      <h2>Textos e marcas</h2>
      <p>O site não usa logomarca nem o nome oficial da Igreja. O Manual Geral é citado apenas pelo número do item, com link para a versão oficial em ChurchofJesusChrist.org.</p>

      <h2>Contato dos administradores</h2>
      {ADMINISTRADORES.length === 0 ? (
        <p className="mut">Contato em definição. Enquanto isso, fale com quem lhe deu acesso ao site.</p>
      ) : (
        <ul className="lista">
          {ADMINISTRADORES.map((a) => <li key={a.nome}><b>{a.nome}</b> · {a.contato}</li>)}
        </ul>
      )}
    </main>
  );
}
