-- Fila de moderação dos vínculos música↔leitura (A4). Como no resto da moderação,
-- é uma função SECURITY DEFINER: o `user` não é legível pela RLS, então o join com
-- o autor só pode sair daqui — e a própria função se protege com is_moderator().
--
-- Lembrando (A4b): estes vínculos JÁ ESTÃO PÚBLICOS. A fila é reativa — o moderador
-- só decide entre REMOVER o vínculo ou MANTER (o que apenas o tira da fila).
create or replace function public.pending_pericope_links()
returns table(
  id uuid, song_id uuid, song_title text, reading_label text,
  suggested_moment text, author_name text, author_email text
)
language sql security definer stable set search_path = '' as $$
  select sp.id, sp.song_id, s.title, p.label, sp.suggested_moment, u.display_name, u.email
  from public.song_pericope sp
  join public.song s on s.id = sp.song_id
  join public.pericope p on p.id = sp.pericope_id
  join public."user" u on u.id = sp.owner_id
  where sp.community_status = 'pending' and public.is_moderator()
  order by sp.created_at;
$$;--> statement-breakpoint
grant execute on function public.pending_pericope_links() to authenticated;