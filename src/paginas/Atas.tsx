import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { baixar } from '../lib/arquivo';
import { mesclar, novoId, useAtas } from '../lib/armazem';
import { useAuth } from '../lib/auth';
import { fd, quando, soma } from '../lib/datas';
import { enviarBackup, ultimoBackup } from '../lib/nuvem';

export default function Atas() {
  const { perfil, nuvem } = useAuth();
  const { atas, salvar } = useAtas(perfil?.id);
  const nav = useNavigate();
  const arq = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState({ t: '', err: false });
  const [armado, setArmado] = useState<string | null>(null);
  const aviso = (t: string, err = false) => setMsg({ t, err });
  const ordenadas = [...atas].sort((x, y) => (y.d.data || '').localeCompare(x.d.data || '') || y.atualizado.localeCompare(x.atualizado));

  const duplicar = (id: string) => {
    const r = atas.find((x) => x.id === id);
    if (!r) return;
    const agora = new Date().toISOString();
    const c = { ...r, id: novoId(), criado: agora, atualizado: agora, d: { ...r.d, data: r.d.data ? soma(r.d.data, 7) : '' } };
    salvar([...atas, c]);
    aviso('Ata duplicada para o domingo seguinte.');
  };
  const excluir = (id: string) => {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 4000);
      return;
    }
    salvar(atas.filter((x) => x.id !== id));
    setArmado(null);
    aviso('Ata excluída.');
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
      if (!salvar(r.a)) throw new Error('armazenamento');
      aviso(`Backup importado: ${r.add} nova(s), ${r.upd} atualizada(s).`);
    } catch {
      aviso('Arquivo inválido ou não foi possível importar.', true);
    }
  };
  const enviar = async () => {
    const e = await enviarBackup(atas);
    aviso(e ?? 'Backup enviado para a nuvem.', Boolean(e));
  };
  const restaurar = async () => {
    const b = await ultimoBackup();
    if (b === 'erro') return aviso('Não foi possível ler o backup da nuvem.', true);
    if (!b) return aviso('Ainda não há backup na nuvem.', true);
    const r = mesclar(atas, b.atas);
    salvar(r.a);
    aviso(`Backup de ${quando(b.criado)} restaurado: ${r.add} nova(s), ${r.upd} atualizada(s).`);
  };

  return (
    <main>
      <Link className="back" to="/">‹ Início</Link>
      <h1>Atas salvas</h1>
      <p className="mut">Ficam salvas neste aparelho e neste navegador, na sua conta. Se limpar os dados do navegador, elas somem: faça backup de vez em quando.</p>
      <div className="acts">
        <Link className="btn p" to="/gerador">Nova ata</Link>
        <button className="btn" type="button" onClick={exportar}>Exportar arquivo</button>
        <button className="btn" type="button" onClick={() => arq.current?.click()}>Importar arquivo</button>
        {nuvem && <button className="btn" type="button" onClick={enviar}>Enviar backup à nuvem</button>}
        {nuvem && <button className="btn" type="button" onClick={restaurar}>Restaurar da nuvem</button>}
      </div>
      <input ref={arq} type="file" accept=".json,application/json" hidden onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = ''; }} />
      {!nuvem && <p className="mut">Backup na nuvem: desligado pelo administrador.</p>}
      <p className={'msg' + (msg.err ? ' err' : '')} role="status" aria-live="polite">{msg.t}</p>
      <div>
        {ordenadas.length === 0 && <p className="mut">Nenhuma ata salva ainda. Preencha uma ata e toque em Salvar.</p>}
        {ordenadas.map((r) => (
          <div className="row" key={r.id}>
            <button className="open" type="button" onClick={() => nav(`/atas/${r.id}`)}>
              <b>{fd(r.d.data) || 'Sem data'}</b>
              <span>{(r.d.dirigida ? `Dirigida: ${r.d.dirigida} · ` : '') + `Atualizada em ${quando(r.atualizado)}`}</span>
            </button>
            <div className="ra">
              <button type="button" onClick={() => duplicar(r.id)}>Duplicar</button>
              <button type="button" data-armed={armado === r.id ? '1' : undefined} onClick={() => excluir(r.id)}>{armado === r.id ? 'Confirmar exclusão' : 'Excluir'}</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
