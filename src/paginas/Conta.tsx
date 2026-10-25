import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apagarTudo } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function Conta() {
  const { perfil, sair } = useAuth();
  const nav = useNavigate();
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [msg, setMsg] = useState({ t: '', err: false });
  const [armado, setArmado] = useState(false);

  const trocar = async (e: FormEvent) => {
    e.preventDefault();
    if (nova.length < 12) return setMsg({ t: 'Use pelo menos 12 caracteres.', err: true });
    if (nova !== conf) return setMsg({ t: 'As senhas não conferem.', err: true });
    const { error } = await supabase!.auth.updateUser({ password: nova });
    if (error) return setMsg({ t: 'Não foi possível trocar a senha. Entre de novo e tente outra vez.', err: true });
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
      <p className="mut">Usuário: <b>{perfil?.usuario}</b> ({perfil?.role === 'admin' ? 'administrador' : 'usuário'})</p>
      <fieldset><legend>Trocar a senha</legend>
        <form className="col" onSubmit={trocar}>
          <div><label htmlFor="n">Nova senha (12 caracteres ou mais)</label><input id="n" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} /></div>
          <div><label htmlFor="c">Repita a nova senha</label><input id="c" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} /></div>
          <button className="btn p" type="submit">Trocar senha</button>
        </form>
      </fieldset>
      <fieldset><legend>Este aparelho</legend>
        <p className="mut">Apaga as atas salvas deste navegador. Útil antes de devolver ou emprestar o aparelho. Se houver backup na nuvem ou em arquivo, ele continua lá.</p>
        <button className="btn" type="button" onClick={apagar}>{armado ? 'Confirmar: apagar tudo' : 'Apagar atas deste aparelho'}</button>
      </fieldset>
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
      <div className="acts"><button className="btn" type="button" onClick={async () => { await sair(); nav('/'); }}>Sair</button></div>
    </main>
  );
}
