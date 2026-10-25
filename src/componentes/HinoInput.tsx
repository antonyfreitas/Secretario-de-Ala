import { useState } from 'react';
import { HINOS, nz, type Hino } from '../lib/hinos';

interface Props { id: string; valor: string; aoMudar: (v: string) => void }

export default function HinoInput({ id, valor, aoMudar }: Props) {
  const [sug, setSug] = useState<Hino[]>([]);
  const buscar = (v: string) => {
    const q = nz(v);
    if (!q) {
      setSug([]);
      return;
    }
    const r = /^\d+$/.test(q) ? HINOS.filter((h) => h.n.startsWith(q)) : HINOS.filter((h) => h.k.includes(q));
    setSug(r.sort((a, b) => Number(b.n === q) - Number(a.n === q) || Number(a.n) - Number(b.n)).slice(0, 8));
  };
  const escolher = (h: Hino) => {
    aoMudar(`${h.n} - ${h.t}`);
    setSug([]);
  };
  return (
    <div className="acw">
      <input
        id={id}
        type="text"
        className={valor.trim() ? 'on' : ''}
        value={valor}
        placeholder="Número ou nome do hino"
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
          {sug.map((h) => (
            <li key={h.n} onPointerDown={(e) => { e.preventDefault(); escolher(h); }}><b>{h.n}</b>{h.t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
