-- Auditoria de visibilidade: quantas linhas cada usuário enxerga de cada tabela, simulando o login dele (RLS).
-- Rode no SQL Editor do Supabase. Nada é alterado (termina com rollback).
-- Esperado: cada usuário vê só a própria ala em atas_ala, atas_historico, entrevistas, destinatarios,
-- manual_estudo e manual_semana. Só o administrador geral vê todos os perfis e todas as alas (para gerenciar).
begin;
create temp table rls_teste (usuario text, tabela text, linhas bigint);
do $$
declare u record; n bigint; t text;
begin
  for u in select p.id, p.usuario from public.profiles p where p.ativo loop
    foreach t in array array['atas_ala','atas_historico','entrevistas','destinatarios','profiles','organizacoes','envios','manual_estudo','manual_semana'] loop
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', json_build_object('sub', u.id, 'role', 'authenticated')::text, true);
      execute format('select count(*) from public.%I', t) into n;
      execute 'reset role';
      insert into rls_teste values (u.usuario, t, n);
    end loop;
  end loop;
end $$;
select usuario, json_object_agg(tabela, linhas) as linhas_visiveis from rls_teste group by usuario order by usuario;
rollback;
