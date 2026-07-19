-- Lista "Meus repertórios" passa a devolver a COR litúrgica (do snapshot), para a
-- bolinha na lista. Adiciona uma coluna ao retorno; a RLS/filtro não muda.
-- (Mudar o RETURNS TABLE exige DROP antes — CREATE OR REPLACE não altera o tipo.)
drop function if exists public.repertoires_mine();--> statement-breakpoint
create or replace function public.repertoires_mine()
returns table(id uuid, title text, type public.repertoire_type, "date" date, owner_id uuid, community_status public.community_status, group_name text, liturgical_color text)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.type, r.date, r.owner_id, r.community_status,
    (select string_agg(g.name, ', ' order by g.name)
       from public.repertoire_group rg join public."group" g on g.id = rg.group_id
       where rg.repertoire_id = r.id),
    r.liturgical_snapshot->>'color'
  from public.repertoire r
  where r.owner_id = auth.uid() or public.in_repertoire_group(r.id)
  order by r.date desc nulls last, r.title;
$$;--> statement-breakpoint
-- DROP apagou o grant; reconcede (a função é chamada como authenticated via RPC).
grant execute on function public.repertoires_mine() to authenticated;
