-- Papel "aprovador" (bispado) além de admin e usuário.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'aprovador', 'user'));

create function public.is_aprovador() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ativo and p.role in ('admin', 'aprovador')) $$;
revoke all on function public.is_aprovador() from public, anon;
grant execute on function public.is_aprovador() to authenticated;

-- Situação da ata: rascunho -> em revisão -> aprovada. Só rascunho pode ser editado.
alter table public.atas_ala
  add column status text not null default 'rascunho' check (status in ('rascunho', 'em_revisao', 'aprovada')),
  add column versao int not null default 1,
  add column comentario text,
  add column enviada_por uuid references auth.users (id) on delete set null,
  add column enviada_por_nome text,
  add column enviada_em timestamptz,
  add column aprovada_por uuid references auth.users (id) on delete set null,
  add column aprovada_por_nome text,
  add column aprovada_em timestamptz;

-- O cliente só pode gravar o conteúdo; situação e autoria só mudam pelas funções abaixo.
revoke insert, update on public.atas_ala from authenticated;
grant insert (id, data, pronta, d) on public.atas_ala to authenticated;
grant update (data, pronta, d) on public.atas_ala to authenticated;

create function public.atas_bloqueio() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status <> 'rascunho' and (new.d is distinct from old.d or new.data is distinct from old.data or new.pronta is distinct from old.pronta) then
      raise exception 'ata bloqueada: só é possível editar em rascunho';
    end if;
    return new;
  end if;
  if old.status <> 'rascunho' then raise exception 'ata em revisão ou aprovada não pode ser excluída'; end if;
  if exists (select 1 from public.atas_versoes v where v.ata_id = old.id) then raise exception 'ata com versões aprovadas não pode ser excluída'; end if;
  return old;
end $$;
create trigger atas_bloqueio before update or delete on public.atas_ala for each row execute function public.atas_bloqueio();

-- Histórico das versões aprovadas.
create table public.atas_versoes (
  id uuid primary key default gen_random_uuid(),
  ata_id uuid not null references public.atas_ala (id) on delete cascade,
  versao int not null,
  d jsonb not null,
  hash text not null,
  aprovada_em timestamptz not null default now(),
  aprovada_por uuid references auth.users (id) on delete set null,
  aprovada_por_nome text,
  unique (ata_id, versao)
);
alter table public.atas_versoes enable row level security;
revoke all on table public.atas_versoes from anon, authenticated;
grant select on public.atas_versoes to authenticated;
create policy versoes_select on public.atas_versoes for select to authenticated
  using (public.is_ativo() and public.nuvem_ligada());

create function public.enviar_para_revisao(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_nome text;
begin
  if not (public.is_ativo() and public.nuvem_ligada()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  select usuario into v_nome from public.profiles where id = (select auth.uid());
  update public.atas_ala set status = 'em_revisao', comentario = null, enviada_por = (select auth.uid()), enviada_por_nome = v_nome, enviada_em = now()
    where id = p_id and status = 'rascunho';
  if not found then raise exception 'a ata não está em rascunho'; end if;
end $$;

create function public.aprovar_ata(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_nome text; r public.atas_ala;
begin
  if not (public.is_aprovador() and public.nuvem_ligada()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into r from public.atas_ala where id = p_id for update;
  if not found or r.status <> 'em_revisao' then raise exception 'a ata não está em revisão'; end if;
  if r.enviada_por is not distinct from (select auth.uid()) then raise exception 'quem enviou a ata não pode aprová-la'; end if;
  select usuario into v_nome from public.profiles where id = (select auth.uid());
  update public.atas_ala set status = 'aprovada', comentario = null, aprovada_por = (select auth.uid()), aprovada_por_nome = v_nome, aprovada_em = now() where id = p_id;
  insert into public.atas_versoes (ata_id, versao, d, hash, aprovada_por, aprovada_por_nome)
  values (p_id, r.versao, r.d, encode(extensions.digest(convert_to(r.d::text, 'utf8'), 'sha256'), 'hex'), (select auth.uid()), v_nome);
end $$;

create function public.devolver_ata(p_id uuid, p_motivo text) returns void
language plpgsql security definer set search_path = ''
as $$
declare r public.atas_ala;
begin
  if not (public.is_ativo() and public.nuvem_ligada()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into r from public.atas_ala where id = p_id for update;
  if not found or r.status <> 'em_revisao' then raise exception 'a ata não está em revisão'; end if;
  if not (public.is_aprovador() or r.enviada_por is not distinct from (select auth.uid())) then raise exception 'sem permissão' using errcode = '42501'; end if;
  update public.atas_ala set status = 'rascunho', comentario = nullif(left(coalesce(p_motivo, ''), 500), '') where id = p_id;
end $$;

create function public.reabrir_ata(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_aprovador() and public.nuvem_ligada()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  update public.atas_ala set status = 'rascunho', versao = versao + 1, comentario = null, aprovada_por = null, aprovada_por_nome = null, aprovada_em = null
    where id = p_id and status = 'aprovada';
  if not found then raise exception 'a ata não está aprovada'; end if;
end $$;

revoke all on function public.enviar_para_revisao(uuid), public.aprovar_ata(uuid), public.devolver_ata(uuid, text), public.reabrir_ata(uuid) from public, anon;
grant execute on function public.enviar_para_revisao(uuid), public.aprovar_ata(uuid), public.devolver_ata(uuid, text), public.reabrir_ata(uuid) to authenticated;

-- Os papéis aceitos na criação e edição de usuários passam a incluir "aprovador"
-- (as funções criar_usuario e editar_usuario foram recriadas com essa validação).
