-- B3 (navegação sincronizada): autoriza os canais Realtime `live:{repertorioId}`.
-- Sem isto, qualquer autenticado que soubesse o UUID poderia entrar no canal e ver/injetar
-- o estado. Tornamos o canal privado (config.private no cliente) e gateamos por ACESSO ao
-- repertório: dono, membro do grupo, ou repertório público. As políticas ficam em
-- `realtime.messages` (onde trafegam broadcast e presence). Ver issue #35.

-- Acesso ao repertório a partir do tópico `live:{uuid}`. Security definer p/ checar sem esbarrar
-- na RLS do próprio repertoire; valida o formato do tópico antes de converter p/ uuid.
create or replace function public.can_sync_repertoire(p_topic text)
returns boolean language plpgsql security definer stable
set search_path = '' as $$
declare
  rid uuid;
begin
  if p_topic !~ '^live:[0-9a-fA-F-]{36}$' then
    return false;
  end if;
  rid := substring(p_topic from 6)::uuid;
  return exists (
    select 1 from public.repertoire r
    where r.id = rid
      and (
        r.owner_id = auth.uid()
        or r.visibility = 'public'
        or (r.group_id is not null and public.is_group_member(r.group_id))
      )
  );
end;
$$;
--> statement-breakpoint
grant execute on function public.can_sync_repertoire(text) to authenticated;
--> statement-breakpoint
-- Receber mensagens do canal (subscribe) exige acesso ao repertório.
create policy "live_sync_read" on realtime.messages
  as permissive for select to authenticated
  using (public.can_sync_repertoire(realtime.topic()));
--> statement-breakpoint
-- Enviar (broadcast/presence) idem.
create policy "live_sync_write" on realtime.messages
  as permissive for insert to authenticated
  with check (public.can_sync_repertoire(realtime.topic()));
