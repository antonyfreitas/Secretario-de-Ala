# Secretaria da Ala Ipanema

Site em React + TypeScript (Vite). Gerador de atas aberto a todos; salvar atas e os demais recursos exigem login.

## Estrutura

- `src/` — o aplicativo (rotas com histórico: o botão Voltar do navegador funciona).
- `supabase/migrations/` — esquema do banco com RLS (políticas de acesso por usuário).
- `public/data/manual-status.json` — gravado toda segunda pelo monitor do Manual (só mês e hash; nenhum texto).
- `scripts/` e `.github/workflows/` — o monitor do Manual.
- `legacy/index.html` — versão antiga em arquivo único (só para consulta).

## Segurança

- Chave pública do Supabase no navegador por desenho; os dados são protegidos pelo RLS no banco.
- Sem cadastro aberto: usuários são criados pelo administrador. Sem perfil ativo, não há acesso a nada.
- Cabeçalhos em `vercel.json` (CSP restrita, HSTS, sem iframe, sem referrer).
- Sessão encerra sozinha após 30 minutos parada.
- Backup na nuvem **desligado por padrão**; só o administrador liga (nomes de membros ficam fora do aparelho).
- Nunca suba dados de membros ao repositório. Segredos só em variáveis de ambiente.

## Configuração

Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Na Vercel, as mesmas duas variáveis em Settings → Environment Variables.

```
npm install
npm run dev     # desenvolvimento
npm run build   # verifica tipos e gera dist/
```
