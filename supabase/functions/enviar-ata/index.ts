import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'método não permitido' }, 405);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return json({ erro: 'não autorizado' }, 401);

  let b: { org_id?: string; titulo?: string; nome?: string; pdf?: string };
  try {
    b = await req.json();
  } catch {
    return json({ erro: 'pedido inválido' }, 400);
  }
  const titulo = String(b.titulo ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 150);
  const nome = String(b.nome ?? 'ata.pdf').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
  const pdf = String(b.pdf ?? '');
  if (!titulo || pdf.length < 100 || pdf.length > 3_000_000 || !/^[A-Za-z0-9+/=]+$/.test(pdf)) return json({ erro: 'dados inválidos' }, 400);
  if (!atob(pdf.slice(0, 8)).startsWith('%PDF')) return json({ erro: 'o arquivo não é um PDF' }, 400);

  // Quem pode enviar e para qual ala: o banco decide (RLS), não o pedido.
  const { data: p } = await sb.from('profiles').select('usuario,role,ativo,org_id').eq('id', u.user.id).maybeSingle();
  if (!p || !p.ativo) return json({ erro: 'sem acesso' }, 403);
  const orgId = p.role === 'admin' && b.org_id ? b.org_id : p.org_id;
  const { data: org } = await sb.from('organizacoes').select('nome,email_ativo').eq('id', orgId).maybeSingle();
  if (!org || !org.email_ativo) return json({ erro: 'o envio por e-mail não está ligado para esta ala' }, 403);

  const { data: dest } = await sb.from('destinatarios').select('email').eq('org_id', orgId).not('email', 'is', null);
  const emails = (dest ?? []).map((d) => d.email as string).filter(Boolean);
  if (!emails.length) return json({ erro: 'nenhum destinatário com e-mail cadastrado' }, 400);

  const desde = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('envios').select('id', { count: 'exact', head: true }).eq('user_id', u.user.id).gte('em', desde);
  if ((count ?? 0) >= 10) return json({ erro: 'limite de envios por hora atingido' }, 429);

  const chave = Deno.env.get('RESEND_API_KEY');
  if (!chave) return json({ erro: 'o servidor de e-mail ainda não foi configurado' }, 500);
  const de = Deno.env.get('EMAIL_FROM') ?? 'Atas Ala <atas-ala@antonyfreitas.com.br>';

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: de,
      to: emails,
      subject: titulo,
      text: `Segue em anexo a ata: ${titulo}.\n\nEnviada por ${p.usuario} pelo sistema da secretaria da ${org.nome}.`,
      attachments: [{ filename: nome, content: pdf }],
    }),
  });
  if (!r.ok) return json({ erro: 'o serviço de e-mail recusou o envio' }, 502);

  await sb.from('envios').insert({ org_id: orgId, titulo, destinatarios: emails.length });
  return json({ ok: true, enviados: emails.length });
});
