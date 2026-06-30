-- Custom SQL migration file, put your code below! --

-- Acesso público por token ao repertório COMPLETO (fatia E1): devolve, num jsonb,
-- o repertório + os slots do template (rótulos) + os itens com a cifra de cada música.
-- security definer (roda como dono) + search_path fixo: o anônimo nunca lê as tabelas
-- direto, só recebe o pacote deste token (validando a validade).
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
          'chordpro', s.chordpro_body
        ) order by i."order"
      )
      from public.repertoire_item i
      join public.song s on s.id = i.song_id
      where i.repertoire_id = r.id
    ), '[]'::jsonb)
  )
  from public.share_link sl
  join public.repertoire r on r.id = sl.repertoire_id
  left join public.slot_template st on st.type = r.type
  where sl.token = p_token
    and (sl.expires_at is null or sl.expires_at > now());
$$;
--> statement-breakpoint
grant execute on function public.get_shared_repertoire_full(text) to anon, authenticated;
