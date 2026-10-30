import { useState } from 'react';
import { fd } from '../lib/datas';
import { norm } from '../lib/entrevistas';
import { resumir, textoResumo, type Indice, type Orador } from '../lib/oradores';

interface Props { id: string; valor: string; aoMudar: (v: string) => void; indice: Indice; dataAta: string; ataId: string | null; outros: string[] }

/** Campo de orador: sugere nomes que já discursaram e mostra, na hora, quando foi o último discurso. */
export default function OradorInput({ id, valor, aoMudar, indice, dataAta, ataId, outros }: Props) {
  const [sug, setSug] = useState<Orador[]>([]);
  const buscar = (v: string) => {
    const q = norm(v);
    if (q.length < 2) {
      setSug([]);
      return;
    }
    setSug([...indice.values()].filter((o) => o.chave.includes(q) && o.chave !== q).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, 6));
  };
  const escolher = (o: Orador) => {
    aoMudar(o.nome);
    setSug([]);
  };
  const nome = valor.trim();
  const r = nome.length >= 2 ? resumir(indice.get(norm(nome)), dataAta, ataId) : null;
  const repetido = nome.length >= 2 && outros.some((x) => norm(x) === norm(nome));

  return (
    <div className="acw">
      <input
        id={id}
        type="text"
        className={nome ? 'on' : ''}
        value={valor}
        autoComplete="off"
        onChange={(e) => { aoMudar(e.target.value); buscar(e.target.value); }}
        onBlur={() => setTimeout(() => setSug([]), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setSug([]);
          if (e.key === 'Enter' && sug[0]) { e.preventDefault(); escolher(sug[0]); }
        }}
      />
      {sug.length > 0 && (
        <ul className="sug">
          {sug.map((o) => (
            <li key={o.chave} onPointerDown={(e) => { e.preventDefault(); escolher(o); }}>
              <span>{o.nome}</span><small>último discurso em {fd(o.discursos[0].data)}</small>
            </li>
          ))}
        </ul>
      )}
      {r && Boolean(indice.size) && <p className={`dica dica-${r.tom}`}>{textoResumo(r)}</p>}
      {repetido && <p className="dica dica-recente">Este nome já está em outro campo desta ata.</p>}
    </div>
  );
}
