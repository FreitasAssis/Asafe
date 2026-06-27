CREATE TABLE "repertoire" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "repertoire_type" NOT NULL,
	"date" date,
	"owner_id" uuid NOT NULL,
	"group_id" uuid,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repertoire" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "repertoire_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"moment_slot" text,
	"order" integer NOT NULL,
	"transpose" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "repertoire_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "repertoire_theme" (
	"repertoire_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "repertoire_theme_repertoire_id_tag_id_pk" PRIMARY KEY("repertoire_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "repertoire_theme" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "slot_template" (
	"type" "repertoire_type" PRIMARY KEY NOT NULL,
	"slots" jsonb NOT NULL,
	"reorderable" boolean NOT NULL,
	"allow_custom_slots" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slot_template" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "repertoire" ADD CONSTRAINT "repertoire_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire" ADD CONSTRAINT "repertoire_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_item" ADD CONSTRAINT "repertoire_item_repertoire_id_repertoire_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoire"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_item" ADD CONSTRAINT "repertoire_item_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_theme" ADD CONSTRAINT "repertoire_theme_repertoire_id_repertoire_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoire"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_theme" ADD CONSTRAINT "repertoire_theme_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "repertoire_select" ON "repertoire" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("repertoire"."owner_id" = auth.uid() OR ("repertoire"."group_id" is not null AND public.is_group_member("repertoire"."group_id")) OR "repertoire"."visibility" = 'public');--> statement-breakpoint
CREATE POLICY "repertoire_insert" ON "repertoire" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("repertoire"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "repertoire_update" ON "repertoire" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("repertoire"."owner_id" = auth.uid()) WITH CHECK ("repertoire"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "repertoire_delete" ON "repertoire" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("repertoire"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "repertoire_item_select" ON "repertoire_item" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id)) or r.visibility = 'public')));--> statement-breakpoint
CREATE POLICY "repertoire_item_insert" ON "repertoire_item" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and r.owner_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "repertoire_item_update" ON "repertoire_item" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and r.owner_id = auth.uid())) WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and r.owner_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "repertoire_item_delete" ON "repertoire_item" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and r.owner_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "repertoire_theme_select" ON "repertoire_theme" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id)) or r.visibility = 'public')));--> statement-breakpoint
CREATE POLICY "repertoire_theme_write" ON "repertoire_theme" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and r.owner_id = auth.uid())) WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and r.owner_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "slot_template_select" ON "slot_template" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
-- GRANTs de tabela: RLS filtra linhas, mas o PostgREST exige privilégio base.
-- (Este Supabase local não auto-expõe tabelas novas.)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire_item" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire_theme" TO "authenticated";--> statement-breakpoint
-- slot_template: dado de referência -> apenas leitura para logados; escrita via service role (seed).
GRANT SELECT ON TABLE "slot_template" TO "authenticated";--> statement-breakpoint
-- service_role contorna RLS, mas ainda exige privilégio base na tabela (este
-- Supabase local não auto-expõe tabelas novas) -> usado para semear/seed nos testes.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire" TO "service_role";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire_item" TO "service_role";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire_theme" TO "service_role";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "slot_template" TO "service_role";