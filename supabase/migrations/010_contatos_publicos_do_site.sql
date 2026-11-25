-- Contatos dos administradores do site, exibidos na página pública "Sobre".
-- Leitura aberta a todos (é público por desenho); só o administrador geral edita.
create table public.contatos_site (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 80),
  contato text not null check (char_length(contato) between 3 and 120),
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.contatos_site enable row level security;
revoke all on table public.contatos_site from anon, authenticated;
grant select on public.contatos_site to anon, authenticated;
grant insert (nome, contato, ordem), update (nome, contato, ordem), delete on public.contatos_site to authenticated;
create policy contatos_leitura on public.contatos_site for select to anon, authenticated using (true);
create policy contatos_inserir on public.contatos_site for insert to authenticated with check (public.is_admin());
create policy contatos_alterar on public.contatos_site for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy contatos_excluir on public.contatos_site for delete to authenticated using (public.is_admin());
