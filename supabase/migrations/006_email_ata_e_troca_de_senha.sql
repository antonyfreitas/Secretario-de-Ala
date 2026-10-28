-- Envio da ata por e-mail: liga por ala e registra cada envio (também limita envios por hora).
alter table public.organizacoes add column email_ativo boolean not null default false;
grant update (email_ativo) on public.organizacoes to authenticated;

create table public.envios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizacoes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null,
  destinatarios int not null,
  em timestamptz not null default now()
);
create index envios_user_em_idx on public.envios (user_id, em desc);
alter table public.envios enable row level security;
revoke all on table public.envios from anon, authenticated;
grant select, insert on public.envios to authenticated;
create policy envios_insert on public.envios for insert to authenticated
  with check (public.is_ativo() and user_id = (select auth.uid()));
create policy envios_select on public.envios for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin() or (public.is_org_admin() and org_id = public.minha_org()));

-- Troca de senha: obrigatória no primeiro acesso e depois de cada redefinição feita pelo administrador.
alter table public.profiles add column trocar_senha boolean not null default false;
alter table public.profiles alter column trocar_senha set default true;

create function public.trocar_minha_senha(p_nova text) returns void
language plpgsql security definer set search_path = ''
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = (select auth.uid()) and ativo;
  if not found then raise exception 'sem permissão' using errcode = '42501'; end if;
  if not (p.trocar_senha or p.role = 'admin') then
    raise exception 'a senha só pode ser trocada pelo administrador da sua ala' using errcode = '42501';
  end if;
  if length(coalesce(p_nova, '')) < 12 then raise exception 'a senha precisa de 12 caracteres ou mais'; end if;
  if exists (select 1 from auth.users u where u.id = p.id and u.encrypted_password = extensions.crypt(p_nova, u.encrypted_password)) then
    raise exception 'escolha uma senha diferente da atual';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_nova, extensions.gen_salt('bf')), updated_at = now() where id = p.id;
  update public.profiles set trocar_senha = false where id = p.id;
end $$;
revoke all on function public.trocar_minha_senha(text) from public, anon;
grant execute on function public.trocar_minha_senha(text) to authenticated;

-- redefinir_senha foi recriada para marcar trocar_senha = true no usuário afetado.
