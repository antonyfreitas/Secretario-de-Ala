-- 1) Remove o fluxo de aprovação (era complicado demais).
drop function if exists public.enviar_para_revisao(uuid), public.aprovar_ata(uuid), public.devolver_ata(uuid, text), public.reabrir_ata(uuid);
drop trigger if exists atas_bloqueio on public.atas_ala;
drop function if exists public.atas_bloqueio();
drop table if exists public.atas_versoes;
alter table public.atas_ala drop column status, drop column versao, drop column comentario, drop column enviada_por,
  drop column enviada_por_nome, drop column enviada_em, drop column aprovada_por, drop column aprovada_por_nome, drop column aprovada_em;

-- 2) Organizações (alas).
create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 2 and 80),
  nuvem_ativa boolean not null default false,
  criado_em timestamptz not null default now()
);
insert into public.organizacoes (nome, nuvem_ativa)
  select 'Ala Ipanema', coalesce((select valor = 'true'::jsonb from public.config where chave = 'nuvem_ativa'), false);

alter table public.profiles add column org_id uuid references public.organizacoes (id);
update public.profiles set org_id = (select id from public.organizacoes where nome = 'Ala Ipanema');
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role = 'aprovador';
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'org_admin', 'user'));
drop function if exists public.is_aprovador();

alter table public.atas_ala add column org_id uuid references public.organizacoes (id);
update public.atas_ala set org_id = (select id from public.organizacoes where nome = 'Ala Ipanema');
alter table public.atas_ala alter column org_id set not null;
create index atas_ala_org_idx on public.atas_ala (org_id, data desc);

-- 3) Funções de apoio.
create function public.minha_org() returns uuid
language sql stable security definer set search_path = ''
as $$ select org_id from public.profiles where id = (select auth.uid()) and ativo $$;

create function public.is_org_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ativo and p.role in ('admin', 'org_admin')) $$;

create function public.org_nuvem(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select nuvem_ativa from public.organizacoes where id = p_org), false) $$;

-- Quem pode gerir um usuário: o administrador geral, ou o admin da organização sobre usuários da mesma organização.
create function public.pode_gerir(p_alvo uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_admin() or exists (
  select 1 from public.profiles me join public.profiles t on t.org_id = me.org_id
  where me.id = (select auth.uid()) and me.ativo and me.role = 'org_admin' and t.id = p_alvo and t.role <> 'admin') $$;

revoke all on function public.minha_org(), public.is_org_admin(), public.org_nuvem(uuid), public.pode_gerir(uuid) from public, anon;
grant execute on function public.minha_org(), public.is_org_admin(), public.org_nuvem(uuid), public.pode_gerir(uuid) to authenticated;

alter table public.atas_ala alter column org_id set default public.minha_org();

-- 4) Políticas por organização.
alter table public.organizacoes enable row level security;
revoke all on table public.organizacoes from anon, authenticated;
grant select, insert, delete on public.organizacoes to authenticated;
grant update (nome, nuvem_ativa) on public.organizacoes to authenticated;
create policy org_select on public.organizacoes for select to authenticated
  using (public.is_ativo() and (public.is_admin() or id = public.minha_org()));
create policy org_insert on public.organizacoes for insert to authenticated with check (public.is_admin());
create policy org_delete on public.organizacoes for delete to authenticated using (public.is_admin());
create policy org_update on public.organizacoes for update to authenticated
  using (public.is_admin() or (public.is_org_admin() and id = public.minha_org()))
  with check (public.is_admin() or (public.is_org_admin() and id = public.minha_org()));

drop policy atas_select on public.atas_ala;
drop policy atas_insert on public.atas_ala;
drop policy atas_update on public.atas_ala;
drop policy atas_delete on public.atas_ala;
revoke insert, update on public.atas_ala from authenticated;
grant insert (id, data, pronta, d, org_id) on public.atas_ala to authenticated;
grant update (data, pronta, d) on public.atas_ala to authenticated;
create policy atas_select on public.atas_ala for select to authenticated
  using (public.is_ativo() and public.org_nuvem(org_id) and (public.is_admin() or org_id = public.minha_org()));
create policy atas_insert on public.atas_ala for insert to authenticated
  with check (public.is_ativo() and public.org_nuvem(org_id) and (public.is_admin() or org_id = public.minha_org()) and criado_por = (select auth.uid()));
create policy atas_update on public.atas_ala for update to authenticated
  using (public.is_ativo() and public.org_nuvem(org_id) and (public.is_admin() or org_id = public.minha_org()))
  with check (public.is_ativo() and public.org_nuvem(org_id) and (public.is_admin() or org_id = public.minha_org()));
create policy atas_delete on public.atas_ala for delete to authenticated
  using (public.is_ativo() and public.org_nuvem(org_id) and (public.is_admin() or org_id = public.minha_org())
         and (criado_por = (select auth.uid()) or public.is_org_admin()));

-- profiles: cada um vê o próprio; admin geral vê todos; admin da organização vê os da sua. Só "ativo" muda direto.
drop policy profiles_select on public.profiles;
drop policy profiles_update_admin on public.profiles;
revoke update on public.profiles from authenticated;
grant update (ativo) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.pode_gerir(id));
create policy profiles_update on public.profiles for update to authenticated
  using (public.pode_gerir(id)) with check (public.pode_gerir(id));

-- 5) Quem editou: carimbo com o nome e histórico de edições (cada versão tem PDF).
alter table public.atas_ala add column atualizado_por_nome text;
drop trigger if exists atas_carimbo on public.atas_ala;
drop function if exists public.atas_carimbo();
create function public.atas_carimbo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := (select auth.uid());
  new.atualizado_por_nome := (select usuario from public.profiles where id = (select auth.uid()));
  return new;
end $$;
create trigger atas_carimbo before insert or update on public.atas_ala for each row execute function public.atas_carimbo();

create table public.atas_historico (
  id uuid primary key default gen_random_uuid(),
  ata_id uuid not null references public.atas_ala (id) on delete cascade,
  d jsonb not null,
  editado_por uuid references auth.users (id) on delete set null,
  editado_por_nome text,
  editado_em timestamptz not null default now()
);
create index atas_historico_idx on public.atas_historico (ata_id, editado_em desc);
alter table public.atas_historico enable row level security;
revoke all on table public.atas_historico from anon, authenticated;
grant select on public.atas_historico to authenticated;
create policy historico_select on public.atas_historico for select to authenticated
  using (exists (select 1 from public.atas_ala a where a.id = atas_historico.ata_id));

create function public.atas_registrar_historico() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.d is distinct from old.d then
    insert into public.atas_historico (ata_id, d, editado_por, editado_por_nome)
    values (new.id, new.d, new.atualizado_por, new.atualizado_por_nome);
    delete from public.atas_historico h where h.ata_id = new.id and h.id not in (
      select id from public.atas_historico where ata_id = new.id order by editado_em desc limit 30);
  end if;
  return null;
end $$;
create trigger atas_historico_trg after insert or update on public.atas_ala for each row execute function public.atas_registrar_historico();

-- 6) Destinatários da cópia (bispado) por organização.
create table public.destinatarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizacoes (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 80),
  papel text not null default 'outro' check (papel in ('bispo', 'conselheiro', 'secretario', 'outro')),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  criado_em timestamptz not null default now()
);
alter table public.destinatarios enable row level security;
revoke all on table public.destinatarios from anon, authenticated;
grant select, insert, update, delete on public.destinatarios to authenticated;
create policy dest_select on public.destinatarios for select to authenticated
  using (public.is_ativo() and (public.is_admin() or org_id = public.minha_org()));
create policy dest_escrita on public.destinatarios for all to authenticated
  using (public.is_ativo() and (public.is_admin() or (public.is_org_admin() and org_id = public.minha_org())))
  with check (public.is_ativo() and (public.is_admin() or (public.is_org_admin() and org_id = public.minha_org())));

-- 7) Gestão de usuários com organização e papéis: criar_usuario, editar_usuario, excluir_usuario e
--    redefinir_senha foram recriadas (admin geral ou admin da organização). Veja o banco para o corpo atual.
