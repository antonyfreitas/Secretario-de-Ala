-- Garante pelo menos um administrador ativo (vale para edição, desativação e exclusão).
create function public.proteger_ultimo_admin() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'admin' and old.ativo
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.ativo)
     and not exists (select 1 from public.profiles p where p.id <> old.id and p.role = 'admin' and p.ativo) then
    raise exception 'é preciso manter pelo menos um administrador ativo';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.proteger_ultimo_admin() from public, anon, authenticated;
create trigger profiles_ultimo_admin before update or delete on public.profiles
  for each row execute function public.proteger_ultimo_admin();

-- Editar usuário (só administrador): nome, papel e nome de usuário (o login acompanha).
create function public.editar_usuario(p_id uuid, p_usuario text, p_nome text, p_role text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user text := lower(trim(coalesce(p_usuario, '')));
  v_mail text;
begin
  if not public.is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if v_user !~ '^[a-z0-9._-]{3,32}$' then raise exception 'usuário inválido (3 a 32 letras minúsculas, números, ponto, traço ou sublinhado)'; end if;
  if p_role not in ('admin', 'user') then raise exception 'papel inválido'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'usuário não encontrado'; end if;
  if exists (select 1 from public.profiles where usuario = v_user and id <> p_id) then raise exception 'esse usuário já existe'; end if;
  v_mail := v_user || '@secretaria.local';
  update public.profiles set usuario = v_user, nome = left(coalesce(p_nome, ''), 80), role = p_role where id = p_id;
  update auth.users set email = v_mail, updated_at = now() where id = p_id;
  update auth.identities set identity_data = identity_data || jsonb_build_object('email', v_mail), updated_at = now()
    where user_id = p_id and provider = 'email';
end $$;

-- Excluir usuário de vez (só administrador). As atas dele passam a ser de quem excluiu.
create function public.excluir_usuario(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_id = (select auth.uid()) then raise exception 'você não pode excluir a si mesmo'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'usuário não encontrado'; end if;
  update public.atas_ala set criado_por = (select auth.uid()) where criado_por = p_id;
  update public.atas_ala set pronta = pronta where atualizado_por = p_id;
  delete from auth.users where id = p_id;
end $$;

revoke all on function public.editar_usuario(uuid, text, text, text) from public, anon;
revoke all on function public.excluir_usuario(uuid) from public, anon;
grant execute on function public.editar_usuario(uuid, text, text, text) to authenticated;
grant execute on function public.excluir_usuario(uuid) to authenticated;
