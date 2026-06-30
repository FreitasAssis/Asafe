CREATE POLICY "song_tag_insert_own" ON "song_tag" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from song s where s.id = "song_tag"."song_id" and s.owner_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "song_tag_delete_own" ON "song_tag" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from song s where s.id = "song_tag"."song_id" and s.owner_id = auth.uid()));--> statement-breakpoint
-- GRANT base p/ as novas políticas (Supabase local não auto-concede). O SELECT já
-- foi concedido na 0002; aqui adicionamos insert/delete para 'authenticated'.
GRANT INSERT, DELETE ON TABLE "song_tag" TO "authenticated";
