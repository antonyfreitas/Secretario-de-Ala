-- O administrador geral gerencia alas, usuários e configurações, mas NÃO lê o conteúdo de outras alas.
-- Atas, histórico, destinatários e registro de envios passam a ser só da própria ala, para todos os papéis.

drop policy atas_select on public.atas_ala;
drop policy atas_insert on public.atas_ala;
drop policy atas_update on public.atas_ala;
drop policy atas_delete on public.atas_ala;
create policy atas_select on public.atas_ala for select to authenticated
  using (public.is_ativo() and public.org_nuvem(org_id) and org_id = public.minha_org());
create policy atas_insert on public.atas_ala for insert to authenticated
  with check (public.is_ativo() and public.org_nuvem(org_id) and org_id = public.minha_org() and criado_por = (select auth.uid()));
create policy atas_update on public.atas_ala for update to authenticated
  using (public.is_ativo() and public.org_nuvem(org_id) and org_id = public.minha_org())
  with check (public.is_ativo() and public.org_nuvem(org_id) and org_id = public.minha_org());
create policy atas_delete on public.atas_ala for delete to authenticated
  using (public.is_ativo() and public.org_nuvem(org_id) and org_id = public.minha_org()
         and (criado_por = (select auth.uid()) or public.is_org_admin()));

drop policy dest_select on public.destinatarios;
drop policy dest_escrita on public.destinatarios;
create policy dest_select on public.destinatarios for select to authenticated
  using (public.is_ativo() and org_id = public.minha_org());
create policy dest_escrita on public.destinatarios for all to authenticated
  using (public.is_ativo() and public.is_org_admin() and org_id = public.minha_org())
  with check (public.is_ativo() and public.is_org_admin() and org_id = public.minha_org());

drop policy envios_select on public.envios;
create policy envios_select on public.envios for select to authenticated
  using (user_id = (select auth.uid()) or (public.is_org_admin() and org_id = public.minha_org()));
