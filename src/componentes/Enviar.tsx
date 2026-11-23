import { useEffect, useState } from 'react';
import { baixar } from '../lib/arquivo';
import { listarDestinatarios, type Destinatario } from '../lib/nuvem';

interface Props { gerar: () => Blob | null; nome: string; titulo: string; orgId?: string; nuvem: boolean }

/** Enviar a cópia: compartilhar o PDF pelo aparelho (WhatsApp ou outro app) e abrir conversa com os destinatários. */
export default function Enviar({ gerar, nome, titulo, orgId, nuvem }: Props) {
  const [dest, setDest] = useState<Destinatario[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!nuvem || !orgId) return;
    let vivo = true;
    void listarDestinatarios(orgId).then((l) => { if (vivo) setDest(l); });
    return () => { vivo = false; };
  }, [nuvem, orgId]);

  const zaps = dest.filter((d) => d.whatsapp);

  const compartilhar = async () => {
    const b = gerar();
    if (!b) return setMsg('Não foi possível gerar o PDF.');
    const f = new File([b], nome, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], title: titulo, text: titulo }); } catch { /* cancelado */ }
    } else {
      baixar(b, nome);
      setMsg('Este aparelho não compartilha arquivos direto: o PDF foi baixado. Anexe no app que preferir.');
    }
  };
  const zap = (d: Destinatario) => window.open(`https://wa.me/${d.whatsapp}?text=${encodeURIComponent(titulo)}`, '_blank', 'noopener,noreferrer');

  return (
    <details className="card">
      <summary><b>Enviar cópia</b></summary>
      <div className="acts">
        <button className="btn p" type="button" onClick={() => void compartilhar()}>Compartilhar PDF</button>
      </div>
      <p className="sub">Compartilhar manda o PDF direto para o WhatsApp ou outro app do aparelho.</p>
      {zaps.length > 0 && (
        <div>
          <p className="sub">Abrir conversa no WhatsApp (depois anexe o PDF baixado)</p>
          {zaps.map((d) => (
            <div className="ln" key={d.id}><span>{d.nome} · {d.papel}</span><button className="btn sw" type="button" onClick={() => zap(d)}>Abrir</button></div>
          ))}
        </div>
      )}
      {nuvem && dest.length === 0 && <p className="sub">Nenhum destinatário cadastrado. O administrador da ala cadastra em Administração.</p>}
      <p className="msg" role="status" aria-live="polite">{msg}</p>
    </details>
  );
}
