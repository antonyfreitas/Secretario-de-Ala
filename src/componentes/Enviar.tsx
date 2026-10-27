import { useEffect, useState } from 'react';
import { baixar } from '../lib/arquivo';
import { listarDestinatarios, type Destinatario } from '../lib/nuvem';

interface Props { gerar: () => Blob | null; nome: string; titulo: string; orgId?: string; nuvem: boolean }

/** Envio sem servidor de e-mail: usa o compartilhamento do aparelho, o app de e-mail e o WhatsApp. */
export default function Enviar({ gerar, nome, titulo, orgId, nuvem }: Props) {
  const [dest, setDest] = useState<Destinatario[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!nuvem || !orgId) return;
    let vivo = true;
    void listarDestinatarios(orgId).then((l) => { if (vivo) setDest(l); });
    return () => { vivo = false; };
  }, [nuvem, orgId]);

  const emails = dest.map((d) => d.email).filter((e): e is string => Boolean(e));
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
  const email = () => {
    const b = gerar();
    if (!b) return setMsg('Não foi possível gerar o PDF.');
    baixar(b, nome);
    window.location.href = `mailto:${emails.join(',')}?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(`Segue a ata. O PDF (${nome}) vai anexado.`)}`;
    setMsg('O PDF foi baixado: anexe-o ao e-mail que abriu.');
  };
  const zap = (d: Destinatario) => window.open(`https://wa.me/${d.whatsapp}?text=${encodeURIComponent(titulo)}`, '_blank', 'noopener,noreferrer');

  return (
    <details className="card">
      <summary><b>Enviar cópia</b></summary>
      <p className="sub">Compartilhar manda o PDF direto para o WhatsApp, e-mail ou outro app. Depois de escolher o contato, é só enviar.</p>
      <div className="acts">
        <button className="btn p" type="button" onClick={() => void compartilhar()}>Compartilhar PDF</button>
        {emails.length > 0 && <button className="btn" type="button" onClick={email}>E-mail para o bispado ({emails.length})</button>}
      </div>
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
