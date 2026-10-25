import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, type Perfil } from '../lib/auth';
import { fd, mesTxt } from '../lib/datas';
import { useManual } from '../lib/manual';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const { perfil, nuvem, recarregarNuvem } = useAuth();
  const { auto } = useManual(perfil?.id);
  const [lista, setLista] = useState<Perfil[]>([]);
  const [msg, setMsg] = useState({ t: '', err: false });
  const aviso = (t: string, err = false) => setMsg({ t, err });

  const carregar = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('id,usuario,nome,role,ativo').order('criado_em');
    if (error) aviso('Não foi possível listar os usuários.', true);
    else setLista((data ?? []) as Perfil[]);
  };
  useEffect(() => { void carregar(); }, []);

  const alternarAtivo = async (p: Perfil) => {
    if (!supabase || p.id === perfil?.id) return;
    const { error } = await supabase.from('profiles').update({ ativo: !p.ativo }).eq('id', p.id);
    if (error) return aviso('Não foi possível alterar o usuário.', true);
    aviso(`${p.usuario}: ${p.ativo ? 'desativado' : 'ativado'}.`);
    await carregar();
  };
  const alternarNuvem = async () => {
    if (!supabase) return;
    const { error } = await supabase.from('config').update({ valor: !nuvem, atualizado_em: new Date().toISOString() }).eq('chave', 'nuvem_ativa');
    if (error) return aviso('Não foi possível alterar a nuvem.', true);
    await recarregarNuvem();
    aviso(`Backup na nuvem: ${!nuvem ? 'ligado' : 'desligado'}.`);
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Administração</h1>
      <p className="mut">Só administradores veem esta página. As permissões também são aplicadas no banco, não só na tela.</p>

      <fieldset><legend>Usuários</legend>
        {lista.map((p) => (
          <div className="ln" key={p.id}>
            <div><b>{p.usuario}</b> <span>{p.role === 'admin' ? 'administrador' : 'usuário'}{p.nome ? ` · ${p.nome}` : ''}</span></div>
            <button className="btn sw" type="button" disabled={p.id === perfil?.id} onClick={() => alternarAtivo(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
          </div>
        ))}
      </fieldset>

      <fieldset><legend>Backup na nuvem</legend>
        <p className="mut">Liga o envio de backups das atas para o servidor, separado por usuário. Isso guarda nomes de membros fora do aparelho. Ligue só com a autorização do bispo e conforme as regras da Igreja.</p>
        <div className="ln"><span>Estado: <b>{nuvem ? 'ligado' : 'desligado'}</b></span><button className="btn sw" type="button" onClick={alternarNuvem}>{nuvem ? 'Desligar' : 'Ligar'}</button></div>
      </fieldset>

      <fieldset><legend>Monitor do Manual</legend>
        {auto
          ? <p>Última verificação: {fd(auto.verificado)}. Atualização mais recente: {mesTxt(auto.ultimoMes)}.</p>
          : <p className="mut">Sem dados do monitor ainda.</p>}
      </fieldset>
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
    </main>
  );
}
