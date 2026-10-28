-- Senha mínima de 8 caracteres: criar_usuario, redefinir_senha e trocar_minha_senha foram recriadas
-- (trocar_minha_senha também recusa senha igual ao usuário). Veja o banco para o corpo atual.

-- Modelo do e-mail da ata, editável por ala (placeholders: {ala}, {data}, {usuario}).
alter table public.organizacoes
  add column email_assunto text check (email_assunto is null or char_length(email_assunto) <= 150),
  add column email_mensagem text check (email_mensagem is null or char_length(email_mensagem) <= 2000),
  add column entrevistas_ativo boolean not null default false;
grant update (email_assunto, email_mensagem, entrevistas_ativo) on public.organizacoes to authenticated;

-- Entrevistas: só quem é da ala vê as da sua ala (nem o administrador geral vê as de outras alas).
create function public.org_entrevistas(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select entrevistas_ativo from public.organizacoes where id = p_org), false) $$;
revoke all on function public.org_entrevistas(uuid) from public, anon;
grant execute on function public.org_entrevistas(uuid) to authenticated;

create table public.entrevistas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.minha_org() references public.organizacoes (id) on delete cascade,
  data date not null,
  pessoa text not null check (char_length(pessoa) between 2 and 40),
  entrevistador text not null check (char_length(entrevistador) between 2 and 40),
  tipo text not null default 'outro' check (tipo in ('recomendacao', 'chamado', 'ministracao', 'acompanhamento', 'outro')),
  assunto text check (assunto is null or char_length(assunto) <= 100),
  criado_por uuid not null default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  atualizado_por_nome text,
  atualizado_em timestamptz not null default now()
);
create index entrevistas_org_data_idx on public.entrevistas (org_id, data desc);

create function public.entrevistas_carimbo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por_nome := (select usuario from public.profiles where id = (select auth.uid()));
  return new;
end $$;
create trigger entrevistas_carimbo before insert or update on public.entrevistas for each row execute function public.entrevistas_carimbo();

alter table public.entrevistas enable row level security;
revoke all on table public.entrevistas from anon, authenticated;
grant select, delete on public.entrevistas to authenticated;
grant insert (id, org_id, data, pessoa, entrevistador, tipo, assunto) on public.entrevistas to authenticated;
grant update (data, pessoa, entrevistador, tipo, assunto) on public.entrevistas to authenticated;
create policy entrev_select on public.entrevistas for select to authenticated
  using (public.is_ativo() and org_id = public.minha_org() and public.org_entrevistas(org_id));
create policy entrev_insert on public.entrevistas for insert to authenticated
  with check (public.is_ativo() and org_id = public.minha_org() and public.org_entrevistas(org_id) and criado_por = (select auth.uid()));
create policy entrev_update on public.entrevistas for update to authenticated
  using (public.is_ativo() and org_id = public.minha_org() and public.org_entrevistas(org_id))
  with check (public.is_ativo() and org_id = public.minha_org() and public.org_entrevistas(org_id));
create policy entrev_delete on public.entrevistas for delete to authenticated
  using (public.is_ativo() and org_id = public.minha_org() and public.org_entrevistas(org_id)
         and (criado_por = (select auth.uid()) or public.is_org_admin()));
