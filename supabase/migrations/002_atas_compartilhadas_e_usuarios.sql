-- Atas compartilhadas na nuvem (todos os usuários ativos veem as mesmas atas) + gestão de usuários pelo admin.

create function public.nuvem_ligada() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.config c where c.chave = 'nuvem_ativa' and c.valor = 'true'::jsonb) $$;
revoke all on function public.nuvem_ligada() from public, anon;
grant execute on function public.nuvem_ligada() to authenticated;

create table public.atas_ala (
  id uuid primary key default gen_random_uuid(),
  data date,
  pronta boolean not null default false,
  d jsonb not null check (pg_column_size(d) < 100000),
  criado_em timestamptz not null default now(),
  criado_por uuid not null default auth.uid() references auth.users (id),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id)
);
create index atas_ala_data_idx on public.atas_ala (data desc);
alter table public.atas_ala enable row level security;
revoke all on table public.atas_ala from anon, authenticated;
grant select, insert, update, delete on public.atas_ala to authenticated;

create function public.atas_carimbo() returns trigger
language plpgsql set search_path = ''
as $$ begin new.atualizado_em := now(); new.atualizado_por := (select auth.uid()); return new; end $$;
create trigger atas_carimbo before update on public.atas_ala for each row execute function public.atas_carimbo();

create policy atas_select on public.atas_ala for select to authenticated
  using (public.is_ativo() and public.nuvem_ligada());
create policy atas_insert on public.atas_ala for insert to authenticated
  with check (public.is_ativo() and public.nuvem_ligada() and criado_por = (select auth.uid()));
create policy atas_update on public.atas_ala for update to authenticated
  using (public.is_ativo() and public.nuvem_ligada()) with check (public.is_ativo() and public.nuvem_ligada());
create policy atas_delete on public.atas_ala for delete to authenticated
  using (public.is_ativo() and public.nuvem_ligada() and (criado_por = (select auth.uid()) or public.is_admin()));

-- Criar usuário (só administrador). A senha vai direto ao banco, que guarda apenas o hash.
create function public.criar_usuario(p_usuario text, p_nome text, p_role text, p_senha text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_user text := lower(trim(coalesce(p_usuario, '')));
  v_mail text;
begin
  if not public.is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if v_user !~ '^[a-z0-9._-]{3,32}$' then raise exception 'usuário inválido (3 a 32 letras minúsculas, números, ponto, traço ou sublinhado)'; end if;
  if p_role not in ('admin', 'user') then raise exception 'papel inválido'; end if;
  if length(coalesce(p_senha, '')) < 12 then raise exception 'a senha precisa de 12 caracteres ou mais'; end if;
  if exists (select 1 from public.profiles where usuario = v_user) then raise exception 'esse usuário já existe'; end if;
  v_mail := v_user || '@secretaria.local';
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_mail,
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_mail, 'email_verified', true), 'email', now(), now(), now());
  insert into public.profiles (id, usuario, nome, role, ativo) values (v_id, v_user, left(coalesce(p_nome, ''), 80), p_role, true);
  return v_id;
end $$;

-- Redefinir a senha de um usuário (só administrador) e encerrar as sessões dele.
create function public.redefinir_senha(p_usuario text, p_senha text) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if length(coalesce(p_senha, '')) < 12 then raise exception 'a senha precisa de 12 caracteres ou mais'; end if;
  select id into v_id from public.profiles where usuario = lower(trim(coalesce(p_usuario, '')));
  if v_id is null then raise exception 'usuário não encontrado'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')), updated_at = now() where id = v_id;
  delete from auth.sessions where user_id = v_id;
end $$;

revoke all on function public.criar_usuario(text, text, text, text) from public, anon;
revoke all on function public.redefinir_senha(text, text) from public, anon;
grant execute on function public.criar_usuario(text, text, text, text) to authenticated;
grant execute on function public.redefinir_senha(text, text) to authenticated;
