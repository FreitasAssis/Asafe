-- A5 v2: quantas vezes cada música aparece NAQUELE momento nos repertórios que o
-- usuário enxerga (hábito → comunidade), e destas quantas na MESMA celebração.
--
-- SECURITY INVOKER (a padrão) de PROPÓSITO: assim a RLS de repertoire/
-- repertoire_item se aplica e a contagem cobre só o que o chamador já pode ver
-- (seus + grupos + aprovados) — "base ampla" sem vazar identidade nem precisar de
-- definer. Ao vivo (reflete repertórios novos na hora).
create or replace function public.moment_song_usage(p_moment text, p_key text)
returns table(song_id uuid, n_moment integer, n_anchor integer)
language sql stable set search_path = '' as $$
  select ri.song_id,
    count(*)::int as n_moment,
    count(*) filter (where r.liturgical_key is not null and r.liturgical_key = p_key)::int as n_anchor
  from public.repertoire_item ri
  join public.repertoire r on r.id = ri.repertoire_id
  where ri.moment_slot = p_moment
  group by ri.song_id;
$$;--> statement-breakpoint
grant execute on function public.moment_song_usage(text, text) to authenticated;