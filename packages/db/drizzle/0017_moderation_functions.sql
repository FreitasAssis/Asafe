-- C3: moderação com motivo estruturado + nota, decisão 'return' (→ returned) e log
-- (moderation_event). Chamadas de 2 args seguem funcionando (reason/note têm default).

-- moderate_song (nova assinatura 4-args; a antiga 2-args é substituída — 2-args cai aqui via default)
DROP FUNCTION IF EXISTS public.moderate_song(uuid, text);--> statement-breakpoint
CREATE FUNCTION public.moderate_song(
  p_song_id uuid, p_decision text,
  p_reason public.moderation_reason DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS public.community_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
declare v public.community_status;
begin
  if not public.is_moderator() then raise exception 'not a moderator'; end if;
  if p_decision not in ('approve','reject','return','revoke') then raise exception 'invalid decision %', p_decision; end if;
  update public.song set community_status = case p_decision
      when 'approve' then 'approved'::public.community_status
      when 'reject' then 'rejected'::public.community_status
      when 'return' then 'returned'::public.community_status
      else 'none'::public.community_status end
    where id = p_song_id returning community_status into v;
  insert into public.moderation_event (target_type, target_id, moderator_id, decision, reason, note)
    values ('song', p_song_id, auth.uid(), p_decision, p_reason, p_note);
  return v;
end; $$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.moderate_song(uuid, text, public.moderation_reason, text) TO authenticated;--> statement-breakpoint

-- moderate_repertoire (idem)
DROP FUNCTION IF EXISTS public.moderate_repertoire(uuid, text);--> statement-breakpoint
CREATE FUNCTION public.moderate_repertoire(
  p_rep_id uuid, p_decision text,
  p_reason public.moderation_reason DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS public.community_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
declare v public.community_status;
begin
  if not public.is_moderator() then raise exception 'not a moderator'; end if;
  if p_decision not in ('approve','reject','return','revoke') then raise exception 'invalid decision %', p_decision; end if;
  update public.repertoire set community_status = case p_decision
      when 'approve' then 'approved'::public.community_status
      when 'reject' then 'rejected'::public.community_status
      when 'return' then 'returned'::public.community_status
      else 'none'::public.community_status end
    where id = p_rep_id returning community_status into v;
  insert into public.moderation_event (target_type, target_id, moderator_id, decision, reason, note)
    values ('repertoire', p_rep_id, auth.uid(), p_decision, p_reason, p_note);
  return v;
end; $$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.moderate_repertoire(uuid, text, public.moderation_reason, text) TO authenticated;--> statement-breakpoint

-- reenvio: 'returned' também pode voltar a pending (além de none/rejected)
CREATE OR REPLACE FUNCTION public.request_publish_song(p_song_id uuid)
RETURNS public.community_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
declare v public.community_status;
begin
  update public.song set community_status = 'pending'
    where id = p_song_id and owner_id = auth.uid() and community_status in ('none','rejected','returned')
    returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.request_publish(p_rep_id uuid)
RETURNS public.community_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
declare v public.community_status;
begin
  update public.repertoire set community_status = 'pending'
    where id = p_rep_id and owner_id = auth.uid() and community_status in ('none','rejected','returned')
    returning community_status into v;
  return v;
end; $$;
