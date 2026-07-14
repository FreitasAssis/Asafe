-- Passa a titularidade do grupo para outro MEMBRO (só o dono atual), de forma atômica: o novo
-- dono vira 'owner' e o dono antigo passa a 'editor'. Security definer porque, ao trocar
-- group.owner_id, o dono antigo perderia o direito (RLS) de ajustar as memberships no meio da
-- operação. Retorna false se o chamador não é o dono, se o alvo não é membro, ou se for ele mesmo.
create or replace function public.transfer_group(p_group_id uuid, p_new_owner uuid)
returns boolean language plpgsql security definer
set search_path = '' as $$
begin
  if p_new_owner = auth.uid() then
    return false;
  end if;
  if not exists (
    select 1 from public."group" g where g.id = p_group_id and g.owner_id = auth.uid()
  ) then
    return false;
  end if;
  if not exists (
    select 1 from public.membership m where m.group_id = p_group_id and m.user_id = p_new_owner
  ) then
    return false;
  end if;

  update public."group" set owner_id = p_new_owner where id = p_group_id;
  update public.membership set role = 'owner' where group_id = p_group_id and user_id = p_new_owner;
  update public.membership set role = 'editor' where group_id = p_group_id and user_id = auth.uid();
  return true;
end; $$;--> statement-breakpoint
grant execute on function public.transfer_group(uuid, uuid) to authenticated;
