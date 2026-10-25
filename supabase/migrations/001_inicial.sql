-- Secretaria da Ala: esquema inicial. Tudo com RLS ligado; nada é lido ou gravado sem política.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null unique check (usuario ~ '^[a-z0-9._-]{3,32}$'),
  nome text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
-- O backup na nuvem nasce DESLIGADO. Só o administrador liga, depois de ter a autorização do bispo.
insert into public.config (chave, valor) values ('nuvem_ativa', 'false'::jsonb);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dados jsonb not null check (pg_column_size(dados) < 2000000),
  criado_em timestamptz not null default now()
);
create index backups_user_criado_idx on public.backups (user_id, criado_em desc);

alter table public.profiles enable row level security;
alter table public.config enable row level security;
alter table public.backups enable row level security;

-- Funções de apoio (security definer, caminho de busca vazio, sem acesso para anônimos).
create function public.is_ativo() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ativo) $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ativo and p.role = 'admin') $$;

revoke all on function public.is_ativo(), public.is_admin() from public, anon;
grant execute on function public.is_ativo(), public.is_admin() to authenticated;

-- Privilégios mínimos: anônimo não toca em nada; logado só o necessário (o RLS faz o resto).
revoke all on table public.profiles, public.config, public.backups from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.config to authenticated;
grant select, insert, delete on public.backups to authenticated;

-- profiles: cada um vê o próprio perfil; admin vê e altera todos. Criar e apagar usuários só pelo SQL.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- config: qualquer usuário ativo lê; só admin altera.
create policy config_select on public.config for select to authenticated using (public.is_ativo());
create policy config_update_admin on public.config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- backups: cada usuário só vê e apaga os próprios; só grava se a nuvem estiver ligada.
create policy backups_select on public.backups for select to authenticated
  using (user_id = (select auth.uid()) and public.is_ativo());
create policy backups_insert on public.backups for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_ativo()
    and exists (select 1 from public.config c where c.chave = 'nuvem_ativa' and c.valor = 'true'::jsonb)
  );
create policy backups_delete on public.backups for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_ativo());
