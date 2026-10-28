import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apagarTudo } from '../lib/armazem';
import { ROTULO_PAPEL, useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function Conta() {
  const { perfil, org, sair } = useAuth();
  const nav = useNavigate();
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [msg, setMsg] = useState({ t: '', err: false });
  const [armado, setArmado] = useState(false);

  const trocar = async (e: FormEvent) => {
    e.preventDefault();
    if (nova.length < 12) return setMsg({ t: 'Use pelo menos 12 caracteres.', err: true });
    if (nova !== conf) return setMsg({ t: 'As senhas não conferem.', err: true });
    const { error } = await supabase!.rpc('trocar_minha_senha', { p_nova: nova });
    if (error) return setMsg({ t: error.message.charAt(0).toUpperCase() + error.message.slice(1) + '.', err: true });
    setNova('');
    setConf('');
    setMsg({ t: 'Senha trocada.', err: false });
  };
  const apagar = () => {
    if (!armado) {
      setArmado(true);
      return;
    }
    if (perfil) apagarTudo(perfil.id);
    setArmado(false);
    setMsg({ t: 'Atas salvas neste aparelho foram apagadas.', err: false });
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Minha conta</h1>
      <p className="mut">Usuário: <b>{perfil?.usuario}</b> ({perfil ? ROTULO_PAPEL[perfil.role] : ''}){org ? ` · ${org.nome}` : ''}</p>
      <fieldset><legend>Senha</legend>
        {perfil?.role === 'admin' ? (
          <form className="col" onSubmit={trocar}>
            <div><label htmlFor="n">Nova senha (12 caracteres ou mais)</label><input id="n" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} /></div>
            <div><label htmlFor="c">Repita a nova senha</label><input id="c" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} /></div>
            <button className="btn p" type="submit">Trocar senha</button>
          </form>
        ) : (
          <p className="mut">Para trocar a senha de novo, peça ao administrador da sua ala.</p>
        )}
      </fieldset>
      <fieldset><legend>Este aparelho</legend>
        <p className="mut">Apaga as atas salvas deste navegador. Útil antes de devolver ou emprestar o aparelho. Se houver atas na nuvem ou backup em arquivo, elas continuam lá.</p>
        <button className="btn" type="button" onClick={apagar}>{armado ? 'Confirmar: apagar tudo' : 'Apagar atas deste aparelho'}</button>
      </fieldset>
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
      <div className="acts"><button className="btn" type="button" onClick={async () => { await sair(); nav('/'); }}>Sair</button></div>
    </main>
  );
}
