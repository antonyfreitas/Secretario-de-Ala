# Secretário de Ala

Site em React + TypeScript (Vite). O gerador de atas é aberto a todos; salvar atas e os demais recursos exigem login.

## Estrutura

- `src/` — o aplicativo (rotas com histórico: o botão Voltar do navegador funciona).
- `src/dados/manual-pontos.txt` — números e títulos dos pontos do Manual Geral, usados no sorteio semanal de estudo (só a estrutura; nenhum texto do Manual).
- `supabase/migrations/` — esquema do banco com RLS (políticas de acesso por usuário e por ala).
- `supabase/functions/enviar-ata/` — função que envia a ata por e-mail (Resend).
- `legacy/index.html` — versão antiga em arquivo único (só para consulta).

## Segurança

- Chave pública do Supabase no navegador por desenho; os dados são protegidos pelo RLS no banco.
- Sem cadastro aberto: usuários são criados por administradores. Sem perfil ativo, não há acesso a nada.
- Cabeçalhos em `vercel.json` (CSP restrita, HSTS, sem iframe, sem referrer).
- Sessão encerra sozinha após 30 minutos parada. Senha trocada no primeiro acesso; depois, só o administrador da ala redefine.
- Recursos que guardam dados fora do aparelho (nuvem, e-mail, entrevistas) nascem desligados em cada ala.
- Nunca suba dados de membros ao repositório. Segredos só em variáveis de ambiente.

## Configuração

Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Na Vercel, as mesmas duas variáveis em Settings → Environment Variables.

```
npm install
npm run dev     # desenvolvimento
npm run build   # verifica tipos e gera dist/
```

## Envio da ata por e-mail

Segredos (Supabase → Edge Functions → Secrets), nunca no repositório: `RESEND_API_KEY` e, opcionalmente, `EMAIL_FROM` (de um domínio verificado no Resend). O envio só funciona se o administrador ligar "E-mail" na ala.
