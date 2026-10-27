import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { baixar } from '../lib/arquivo';
import { carregar, mesclar, novoId, useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, quando, soma } from '../lib/datas';

export default function Atas() {
  const { perfil, nuvem } = useAuth();
  const { atas, salvar, carregando } = useAtas(perfil?.id, nuvem);
  const nav = useNavigate();
  const arq = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState({ t: '', err: false });
  const [armado, setArmado] = useState<string | null>(null);
  const aviso = (t: string, err = false) => setMsg({ t, err });
  const ordenadas = [...atas].sort((x, y) => (y.d.data || '').localeCompare(x.d.data || '') || y.atualizado.localeCompare(x.atualizado));
  const locais = perfil ? carregar(perfil.id) : [];

  const duplicar = async (id: string) => {
    const r = atas.find((x) => x.id === id);
    if (!r) return;
    const agora = new Date().toISOString();
    const c = { ...r, id: novoId(), criado: agora, atualizado: agora, d: { ...r.d, data: r.d.data ? soma(r.d.data, 7) : '' } };
    aviso((await salvar([...atas, c])) ? 'Ata duplicada para o domingo seguinte.' : 'Não foi possível duplicar.', false);
  };
  const excluir = async (id: string) => {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 4000);
      return;
    }
    setArmado(null);
    const ok = await salvar(atas.filter((x) => x.id !== id));
    aviso(ok ? 'Ata excluída.' : 'Não foi possível excluir (só quem criou a ata ou o administrador pode).', !ok);
  };
  const exportar = () => {
    if (!atas.length) return aviso('Não há atas salvas para exportar.', true);
    const nome = `atas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    baixar(new Blob([JSON.stringify({ app: 'secretaria-ala', v: 2, exportado: new Date().toISOString(), atas }, null, 1)], { type: 'application/json' }), nome);
    aviso(`Backup pronto: ${nome}`);
  };
  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text()) as { app?: string; atas?: unknown[] };
      if (j.app !== 'secretaria-ala' || !Array.isArray(j.atas)) throw new Error('formato');
      const r = mesclar(atas, j.atas);
      if (!(await salvar(r.a))) throw new Error('gravação');
      aviso(`Backup importado: ${r.add} nova(s), ${r.upd} atualizada(s).`);
    } catch {
      aviso('Arquivo inválido ou não foi possível importar.', true);
    }
  };
  const enviarLocais = async () => {
    const r = mesclar(atas, locais);
    aviso((await salvar(r.a)) ? `Enviadas para a nuvem: ${r.add} nova(s).` : 'Não foi possível enviar todas.', false);
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Atas salvas</h1>
      <p className="mut">
        {nuvem
          ? 'Ficam salvas na nuvem: todos os usuários com login veem e editam as mesmas atas.'
          : 'Ficam salvas neste aparelho e neste navegador, na sua conta. Se limpar os dados do navegador, elas somem: faça backup de vez em quando.'}
        {carregando ? ' Carregando…' : ''}
      </p>
      <div className="acts">
        <Link className="btn p" to="/gerador">Nova ata</Link>
        <button className="btn" type="button" onClick={exportar}>Exportar arquivo</button>
        <button className="btn" type="button" onClick={() => arq.current?.click()}>Importar arquivo</button>
        {nuvem && locais.length > 0 && <button className="btn" type="button" onClick={() => void enviarLocais()}>Enviar atas deste aparelho à nuvem</button>}
      </div>
      <input ref={arq} type="file" accept=".json,application/json" hidden onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = ''; }} />
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
      <div>
        {!carregando && ordenadas.length === 0 && <p className="mut">Nenhuma ata salva ainda. Preencha uma ata e toque em Salvar.</p>}
        {ordenadas.map((r) => (
          <div className="row" key={r.id}>
            <button className="open" type="button" onClick={() => nav(`/atas/${r.id}`)}>
              <b>{fd(r.d.data) || 'Sem data'}</b>
              <span>{(r.d.dirigida ? `Dirigida: ${r.d.dirigida} · ` : '') + `Atualizada em ${quando(r.atualizado)}` + (nuvem && r.atualizadoPorNome ? ` por ${r.atualizadoPorNome}` : '')}</span>
            </button>
            <div className="ra">
              <button type="button" onClick={() => void duplicar(r.id)}>Duplicar</button>
              <button type="button" data-armed={armado === r.id ? '1' : undefined} onClick={() => void excluir(r.id)}>{armado === r.id ? 'Confirmar exclusão' : 'Excluir'}</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
