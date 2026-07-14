-- Exclui um grupo (só o DONO), em cascata e de forma atômica: desvincula os repertórios que
-- estavam com o grupo (group_id → null, volta a privado), e apaga pedidos, convites e
-- memberships antes do próprio grupo (as FKs pro group são NO ACTION). Security definer porque
-- toca tabelas com RLS própria. Retorna false se não for o dono (ou grupo inexistente).
create or replace function public.delete_group(p_group_id uuid)
returns boolean language plpgsql security definer
set search_path = '' as $$
begin
  if not exists (
    select 1 from public."group" g where g.id = p_group_id and g.owner_id = auth.uid()
  ) then
    return false;
  end if;

  update public.repertoire set group_id = null, visibility = 'private' where group_id = p_group_id;
  delete from public.join_request where group_id = p_group_id;
  delete from public.group_invite where group_id = p_group_id;
  delete from public.membership where group_id = p_group_id;
  delete from public."group" where id = p_group_id;
  return true;
end; $$;--> statement-breakpoint
grant execute on function public.delete_group(uuid) to authenticated;
