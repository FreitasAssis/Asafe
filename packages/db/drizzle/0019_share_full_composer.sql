-- C12 — atribuição sempre visível quando a obra é pública (direito moral, §5/§10).
-- O link público (get_shared_repertoire_full) devolvia title + chordpro, mas não o
-- compositor — a atribuição sumia justo na superfície mais aberta. Passa a devolver
-- 'composer' por item (a página pública exibe o autor). Sem mudança de assinatura.
create or replace function public.get_shared_repertoire_full(p_token text)
returns jsonb language sql security definer stable
set search_path = '' as $$
  select jsonb_build_object(
    'repertoire', jsonb_build_object('title', r.title, 'type', r.type, 'date', r.date),
    'slots', coalesce(st.slots, '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'momentSlot', i.moment_slot,
          'order', i."order",
          'transpose', i.transpose,
          'notes', i.notes,
          'title', s.title,
          'composer', s.composer,
          'chordpro', sc.chordpro_body
        ) order by i."order"
      )
      from public.repertoire_item i
      join public.song s on s.id = i.song_id
      left join public.song_content sc on sc.song_id = s.id
      where i.repertoire_id = r.id
    ), '[]'::jsonb)
  )
  from public.share_link sl
  join public.repertoire r on r.id = sl.repertoire_id
  left join public.slot_template st on st.type = r.type
  where sl.token = p_token
    and (sl.expires_at is null or sl.expires_at > now());
$$;
