-- "Meus repertórios" passa a ordenar pelos eventos mais PRÓXIMOS primeiro:
--  1) futuros (data >= hoje) em ordem crescente — o próximo evento no topo;
--  2) passados em ordem decrescente — o mais recente antes do mais antigo;
--  3) sem data por último (ordenados por título).
-- Só muda o ORDER BY; o retorno (RETURNS TABLE) é idêntico, então CREATE OR
-- REPLACE basta (sem DROP, o grant se mantém).
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
  order by
    case when r.date is null then 2
         when r.date >= current_date then 0
         else 1 end,
    case when r.date >= current_date then r.date end asc,
    case when r.date < current_date then r.date end desc,
    r.title;
$$;
