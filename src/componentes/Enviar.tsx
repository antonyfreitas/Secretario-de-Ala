import { useEffect, useState } from 'react';
import { baixar } from '../lib/arquivo';
import { listarDestinatarios, listarOrgs, type Destinatario } from '../lib/nuvem';
import { supabase } from '../lib/supabase';

interface Props { gerar: () => Blob | null; nome: string; titulo: string; dataTxt: string; orgId?: string; nuvem: boolean }

async function paraBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Enviar a cópia: e-mail automático (se a ala ligou), compartilhamento do aparelho, e-mail aberto no app e WhatsApp. */
export default function Enviar({ gerar, nome, titulo, dataTxt, orgId, nuvem }: Props) {
  const [dest, setDest] = useState<Destinatario[]>([]);
  const [emailAtivo, setEmailAtivo] = useState(false);
  const [msg, setMsg] = useState('');
  const [armado, setArmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!nuvem || !orgId) return;
    let vivo = true;
    void listarDestinatarios(orgId).then((l) => { if (vivo) setDest(l); });
    void listarOrgs().then((o) => { if (vivo) setEmailAtivo(o.find((x) => x.id === orgId)?.emailAtivo === true); });
    return () => { vivo = false; };
  }, [nuvem, orgId]);

  const emails = dest.map((d) => d.email).filter((e): e is string => Boolean(e));
  const zaps = dest.filter((d) => d.whatsapp);

  const automatico = async () => {
    if (!armado) {
      setArmado(true);
      setTimeout(() => setArmado(false), 6000);
      return;
    }
    setArmado(false);
    const b = gerar();
    if (!b || !supabase) return setMsg('Não foi possível gerar o PDF.');
    setEnviando(true);
    setMsg('Enviando…');
    const { data, error } = await supabase.functions.invoke('enviar-ata', { body: { org_id: orgId, data: dataTxt, nome, pdf: await paraBase64(b) } });
    setEnviando(false);
    if (error || !data?.ok) {
      let texto = 'Não foi possível enviar.';
      try {
        const j = await (error as unknown as { context: Response }).context.json();
        if (j?.erro) texto = `Não foi possível enviar: ${j.erro}.`;
      } catch {
        /* sem detalhe */
      }
      return setMsg(texto);
    }
    setMsg(`Ata enviada por e-mail para ${data.enviados} destinatário(s).`);
  };
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
      <div className="acts">
        {emailAtivo && emails.length > 0 && (
          <button className="btn p" type="button" disabled={enviando} onClick={() => void automatico()}>
            {armado ? `Confirmar: enviar a ${emails.length} destinatário(s)` : `Enviar por e-mail agora (${emails.length})`}
          </button>
        )}
        <button className="btn" type="button" onClick={() => void compartilhar()}>Compartilhar PDF</button>
        {emails.length > 0 && <button className="btn" type="button" onClick={email}>Abrir no meu e-mail</button>}
      </div>
      <p className="sub">{emailAtivo ? 'O envio por e-mail sai do endereço do sistema, com o PDF anexado. ' : ''}Compartilhar manda o PDF direto para o WhatsApp ou outro app do aparelho.</p>
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
