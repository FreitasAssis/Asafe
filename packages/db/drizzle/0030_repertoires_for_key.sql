-- A5 (âncora): dado uma liturgical_key, lista os repertórios da MESMA celebração
-- para reaproveitar ao criar a Missa. Devolve os SEUS/do grupo e os da COMUNIDADE
-- aprovados de outras pessoas (com autor). `mine` separa as duas intenções na UI.
--
-- Security definer (para o join com o autor, que não é legível pela RLS), mas
-- replica a visibilidade: só o que o usuário já poderia ver (seu, do grupo ou
-- aprovado). Exclui o próprio repertório recém-criado (p_exclude).
create or replace function public.repertoires_for_key(p_key text, p_exclude uuid)
returns table(id uuid, title text, "date" date, mine boolean, author_name text, author_email text)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.date,
    (r.owner_id = auth.uid() or public.in_repertoire_group(r.id)) as mine,
    u.display_name, u.email
  from public.repertoire r
  join public."user" u on u.id = r.owner_id
  where r.liturgical_key = p_key
    and r.id <> p_exclude
    and (r.owner_id = auth.uid() or public.in_repertoire_group(r.id) or r.community_status = 'approved')
  order by (r.owner_id = auth.uid() or public.in_repertoire_group(r.id)) desc, r.date desc nulls last;
$$;--> statement-breakpoint
grant execute on function public.repertoires_for_key(text, uuid) to authenticated;