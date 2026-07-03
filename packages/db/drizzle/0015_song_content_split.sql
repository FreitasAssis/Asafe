CREATE TABLE "song_content" (
	"song_id" uuid PRIMARY KEY NOT NULL,
	"chordpro_body" text
);
--> statement-breakpoint
ALTER TABLE "song_content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Grants de DML (as tabelas antigas herdaram por default privilege; a nova precisa
-- explícito). A RLS acima é o gate real; o anon não tem auth.uid() → não lê nenhuma linha.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "song_content" TO anon, authenticated, service_role;--> statement-breakpoint
ALTER TABLE "song_content" ADD CONSTRAINT "song_content_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Move a cifra existente para a tabela nova ANTES de dropar a coluna.
INSERT INTO "song_content" ("song_id", "chordpro_body") SELECT "id", "chordpro_body" FROM "song";--> statement-breakpoint
ALTER TABLE "song" DROP COLUMN "chordpro_body";--> statement-breakpoint
CREATE POLICY "song_content_select" ON "song_content" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from song s where s.id = "song_content"."song_id" and (
          s.owner_id = auth.uid()
          or exists (
            select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id
            where ri.song_id = s.id and r.group_id is not null and public.is_group_member(r.group_id)
          )
          or (
            s.copyright_status in ('dominio_publico','licenca_aberta','permissao')
            and (
              s.community_status = 'approved'
              or exists (
                select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id
                where ri.song_id = s.id and r.community_status = 'approved'
              )
            )
          )
          or (
            public.is_moderator() and (
              s.community_status = 'pending'
              or exists (
                select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id
                where ri.song_id = s.id and r.community_status = 'pending'
              )
            )
          )
        )
      ));--> statement-breakpoint
CREATE POLICY "song_content_write_own" ON "song_content" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from song s where s.id = "song_content"."song_id" and s.owner_id = auth.uid())) WITH CHECK (exists (select 1 from song s where s.id = "song_content"."song_id" and s.owner_id = auth.uid()));--> statement-breakpoint
-- get_shared_repertoire_full: a cifra agora vem de song_content (join). A função é
-- security definer (roda como dono) → o link público segue devolvendo o corpo cheio,
-- igual a hoje (o aperto do link público é fatia separada). Ver DIREITOS-AUTORAIS.
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