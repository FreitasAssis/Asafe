CREATE TABLE "song" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"composer" text,
	"default_key" text,
	"chordpro_body" text,
	"audio_links" text[] DEFAULT '{}'::text[] NOT NULL,
	"owner_id" uuid,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "tag_category" NOT NULL,
	"owner_id" uuid
);
--> statement-breakpoint
ALTER TABLE "tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "song_tag" (
	"song_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "song_tag_song_id_tag_id_pk" PRIMARY KEY("song_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "song_tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_song_tag_override" (
	"user_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"action" "tag_override_action" NOT NULL,
	CONSTRAINT "user_song_tag_override_user_id_song_id_tag_id_pk" PRIMARY KEY("user_id","song_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "user_song_tag_override" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "song" ADD CONSTRAINT "song_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_tag" ADD CONSTRAINT "song_tag_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_tag" ADD CONSTRAINT "song_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_song_tag_override" ADD CONSTRAINT "user_song_tag_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_song_tag_override" ADD CONSTRAINT "user_song_tag_override_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_song_tag_override" ADD CONSTRAINT "user_song_tag_override_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "song_select" ON "song" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("song"."owner_id" is null OR "song"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "song_write_own" ON "song" AS PERMISSIVE FOR ALL TO "authenticated" USING ("song"."owner_id" = auth.uid()) WITH CHECK ("song"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "tag_select" ON "tag" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tag"."owner_id" is null OR "tag"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "tag_write_own" ON "tag" AS PERMISSIVE FOR ALL TO "authenticated" USING ("tag"."owner_id" = auth.uid()) WITH CHECK ("tag"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "song_tag_select" ON "song_tag" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "override_own" ON "user_song_tag_override" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_song_tag_override"."user_id" = auth.uid()) WITH CHECK ("user_song_tag_override"."user_id" = auth.uid());--> statement-breakpoint
-- GRANTs de tabela: RLS filtra linhas, mas o PostgREST exige privilégio base.
-- (Este Supabase local não auto-expõe tabelas novas.)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "song" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tag" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user_song_tag_override" TO "authenticated";--> statement-breakpoint
-- song_tag: leitura para logados; escrita só via service role (curadoria/admin).
GRANT SELECT ON TABLE "song_tag" TO "authenticated";--> statement-breakpoint
-- service_role contorna RLS, mas ainda exige privilégio base na tabela (este
-- Supabase local não auto-expõe tabelas novas) -> usado para semear catálogo global.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "song" TO "service_role";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tag" TO "service_role";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "song_tag" TO "service_role";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user_song_tag_override" TO "service_role";