CREATE TYPE "public"."community_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "community_status" "community_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "repertoire" ADD COLUMN "community_status" "community_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint

-- === Comunidade: papel, publicação moderada de repertório e música ===
-- "Global" da música é DERIVADO (aprovada direto OU num repertório aprovado) — sem flag.
create or replace function public.is_moderator()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public."user" u where u.id = auth.uid() and u.role in ('moderator', 'admin'));
$$;--> statement-breakpoint
grant execute on function public.is_moderator() to authenticated;--> statement-breakpoint

-- Repertório: dono pede / moderador decide / dono retira
create or replace function public.request_publish(p_rep_id uuid)
returns public.community_status language plpgsql security definer set search_path = '' as $$
declare v public.community_status;
begin
  update public.repertoire set community_status = 'pending'
    where id = p_rep_id and owner_id = auth.uid() and community_status in ('none', 'rejected')
    returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
grant execute on function public.request_publish(uuid) to authenticated;--> statement-breakpoint

create or replace function public.moderate_repertoire(p_rep_id uuid, p_decision text)
returns public.community_status language plpgsql security definer set search_path = '' as $$
declare v public.community_status;
begin
  if not public.is_moderator() then raise exception 'not a moderator'; end if;
  if p_decision not in ('approve', 'reject', 'revoke') then raise exception 'invalid decision %', p_decision; end if;
  update public.repertoire set community_status = case p_decision
      when 'approve' then 'approved'::public.community_status
      when 'reject' then 'rejected'::public.community_status
      else 'none'::public.community_status end
    where id = p_rep_id returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
grant execute on function public.moderate_repertoire(uuid, text) to authenticated;--> statement-breakpoint

create or replace function public.withdraw_publish(p_rep_id uuid)
returns public.community_status language plpgsql security definer set search_path = '' as $$
declare v public.community_status;
begin
  update public.repertoire set community_status = 'none'
    where id = p_rep_id and owner_id = auth.uid() returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
grant execute on function public.withdraw_publish(uuid) to authenticated;--> statement-breakpoint

-- Música: mesmo padrão
create or replace function public.request_publish_song(p_song_id uuid)
returns public.community_status language plpgsql security definer set search_path = '' as $$
declare v public.community_status;
begin
  update public.song set community_status = 'pending'
    where id = p_song_id and owner_id = auth.uid() and community_status in ('none', 'rejected')
    returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
grant execute on function public.request_publish_song(uuid) to authenticated;--> statement-breakpoint

create or replace function public.moderate_song(p_song_id uuid, p_decision text)
returns public.community_status language plpgsql security definer set search_path = '' as $$
declare v public.community_status;
begin
  if not public.is_moderator() then raise exception 'not a moderator'; end if;
  if p_decision not in ('approve', 'reject', 'revoke') then raise exception 'invalid decision %', p_decision; end if;
  update public.song set community_status = case p_decision
      when 'approve' then 'approved'::public.community_status
      when 'reject' then 'rejected'::public.community_status
      else 'none'::public.community_status end
    where id = p_song_id returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
grant execute on function public.moderate_song(uuid, text) to authenticated;--> statement-breakpoint

create or replace function public.withdraw_publish_song(p_song_id uuid)
returns public.community_status language plpgsql security definer set search_path = '' as $$
declare v public.community_status;
begin
  update public.song set community_status = 'none'
    where id = p_song_id and owner_id = auth.uid() returning community_status into v;
  return v;
end; $$;--> statement-breakpoint
grant execute on function public.withdraw_publish_song(uuid) to authenticated;--> statement-breakpoint

-- Listas separadas (meus x comunidade) e filas de moderação
create or replace function public.repertoires_mine()
returns table(id uuid, title text, type public.repertoire_type, "date" date, owner_id uuid, community_status public.community_status, group_name text)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.type, r.date, r.owner_id, r.community_status, g.name
  from public.repertoire r left join public."group" g on g.id = r.group_id
  where r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id))
  order by r.date desc nulls last, r.title;
$$;--> statement-breakpoint
grant execute on function public.repertoires_mine() to authenticated;--> statement-breakpoint

create or replace function public.repertoires_community()
returns table(id uuid, title text, type public.repertoire_type, "date" date, owner_id uuid, author_name text, author_email text)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.type, r.date, r.owner_id, u.display_name, u.email
  from public.repertoire r join public."user" u on u.id = r.owner_id
  where r.community_status = 'approved' and r.owner_id <> auth.uid()
  order by r.date desc nulls last, r.title;
$$;--> statement-breakpoint
grant execute on function public.repertoires_community() to authenticated;--> statement-breakpoint

create or replace function public.pending_publish_requests()
returns table(id uuid, title text, type public.repertoire_type, owner_id uuid, owner_name text, owner_email text)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.type, r.owner_id, u.display_name, u.email
  from public.repertoire r join public."user" u on u.id = r.owner_id
  where r.community_status = 'pending' and public.is_moderator()
  order by r.title;
$$;--> statement-breakpoint
grant execute on function public.pending_publish_requests() to authenticated;--> statement-breakpoint

create or replace function public.pending_song_requests()
returns table(id uuid, title text, owner_id uuid, owner_name text, owner_email text)
language sql security definer stable set search_path = '' as $$
  select s.id, s.title, s.owner_id, u.display_name, u.email
  from public.song s join public."user" u on u.id = s.owner_id
  where s.community_status = 'pending' and public.is_moderator()
  order by s.title;
$$;--> statement-breakpoint
grant execute on function public.pending_song_requests() to authenticated;--> statement-breakpoint

-- Contador para o indicador da sidebar (0 para não-moderador)
create or replace function public.pending_moderation_count()
returns integer language sql security definer stable set search_path = '' as $$
  select case when public.is_moderator() then
    (select count(*) from public.repertoire where community_status = 'pending')
    + (select count(*) from public.song where community_status = 'pending')
  else 0 end::integer;
$$;--> statement-breakpoint
grant execute on function public.pending_moderation_count() to authenticated;--> statement-breakpoint

CREATE POLICY "song_select_moderation" ON "song" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_moderator() and ("song"."community_status" = 'pending' or exists (select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id where ri.song_id = "song"."id" and r.community_status = 'pending')));--> statement-breakpoint
ALTER POLICY "song_select" ON "song" TO authenticated USING ("song"."owner_id" is null OR "song"."owner_id" = auth.uid() OR "song"."community_status" = 'approved' OR exists (select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id where ri.song_id = "song"."id" and r.community_status = 'approved'));--> statement-breakpoint
ALTER POLICY "repertoire_select" ON "repertoire" TO authenticated USING ("repertoire"."owner_id" = auth.uid() OR ("repertoire"."group_id" is not null AND public.is_group_member("repertoire"."group_id")) OR "repertoire"."community_status" = 'approved' OR ("repertoire"."community_status" = 'pending' AND public.is_moderator()));--> statement-breakpoint
ALTER POLICY "repertoire_item_select" ON "repertoire_item" TO authenticated USING (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id)) or r.community_status = 'approved' or (r.community_status = 'pending' and public.is_moderator()))));--> statement-breakpoint
ALTER POLICY "repertoire_theme_select" ON "repertoire_theme" TO authenticated USING (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id)) or r.community_status = 'approved' or (r.community_status = 'pending' and public.is_moderator()))));