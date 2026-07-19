-- A1 — Schema litúrgico (issue #27). Ver DESIGN.md §6.
-- Tabelas: cache (liturgical_day, lectionary), leitura (pericope, pericope_segment)
-- e vínculo música↔leitura (song_pericope). Colunas litúrgicas aditivas em repertoire.
-- Padrões: cache = SELECT logado + escrita service_role (como slot_template);
-- pericope/song_pericope = próprio + global/aprovado (como tag/song).

-- ── repertoire: colunas litúrgicas (aditivas, nuláveis) ──────────────────────
ALTER TABLE "repertoire" ADD COLUMN "liturgical_key" text;--> statement-breakpoint
ALTER TABLE "repertoire" ADD COLUMN "liturgical_snapshot" jsonb;--> statement-breakpoint
CREATE INDEX "repertoire_liturgical_key_idx" ON "repertoire" USING btree ("liturgical_key");--> statement-breakpoint

-- ── liturgical_day: cache camada 1 (resolução do dia, específica do ano) ──────
CREATE TABLE "liturgical_day" (
	"date" date NOT NULL,
	"nation" text NOT NULL,
	"data" jsonb NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "liturgical_day_pk" PRIMARY KEY ("date", "nation")
);--> statement-breakpoint
ALTER TABLE "liturgical_day" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "liturgical_day_select" ON "liturgical_day" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
-- Só leitura para o app; a ingestão escreve via service_role (contorna RLS).
GRANT SELECT ON TABLE "liturgical_day" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "liturgical_day" TO service_role;--> statement-breakpoint

-- ── lectionary: cache camada 2 (dicionário de leituras por posição litúrgica) ─
CREATE TABLE "lectionary" (
	"liturgical_key" text NOT NULL,
	"cycle" text NOT NULL,
	"readings" jsonb NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lectionary_pk" PRIMARY KEY ("liturgical_key", "cycle")
);--> statement-breakpoint
ALTER TABLE "lectionary" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "lectionary_select" ON "lectionary" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
GRANT SELECT ON TABLE "lectionary" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "lectionary" TO service_role;--> statement-breakpoint

-- ── pericope: identidade da leitura (own + global/catálogo) ───────────────────
CREATE TABLE "pericope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"owner_id" uuid DEFAULT auth.uid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "pericope" ADD CONSTRAINT "pericope_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pericope_owner_id_idx" ON "pericope" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "pericope" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- owner_id NULL = catálogo global (curado via service_role); setado = própria.
CREATE POLICY "pericope_select" ON "pericope" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("owner_id" is null OR "owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "pericope_write_own" ON "pericope" AS PERMISSIVE FOR ALL TO "authenticated" USING ("owner_id" = auth.uid()) WITH CHECK ("owner_id" = auth.uid());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "pericope" TO authenticated, service_role;--> statement-breakpoint

-- ── pericope_segment: decomposição em intervalos (livro/cap/versículos) p/ A4 ──
CREATE TABLE "pericope_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pericope_id" uuid NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"verse_start" integer NOT NULL,
	"verse_end" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "pericope_segment" ADD CONSTRAINT "pericope_segment_pericope_id_fk" FOREIGN KEY ("pericope_id") REFERENCES "public"."pericope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pericope_segment_pericope_id_idx" ON "pericope_segment" USING btree ("pericope_id");--> statement-breakpoint
ALTER TABLE "pericope_segment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Segue a visibilidade da perícope-pai (subconsulta roda sob a RLS do usuário).
CREATE POLICY "pericope_segment_select" ON "pericope_segment" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.pericope p where p.id = "pericope_id"));--> statement-breakpoint
CREATE POLICY "pericope_segment_write_own" ON "pericope_segment" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.pericope p where p.id = "pericope_id" and p.owner_id = auth.uid())) WITH CHECK (exists (select 1 from public.pericope p where p.id = "pericope_id" and p.owner_id = auth.uid()));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "pericope_segment" TO authenticated, service_role;--> statement-breakpoint

-- ── song_pericope: vínculo música↔leitura (own + global/aprovado, como song/tag) ─
CREATE TABLE "song_pericope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"pericope_id" uuid NOT NULL,
	"suggested_moment" text,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"community_status" "community_status" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "song_pericope" ADD CONSTRAINT "song_pericope_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_pericope" ADD CONSTRAINT "song_pericope_pericope_id_fk" FOREIGN KEY ("pericope_id") REFERENCES "public"."pericope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_pericope" ADD CONSTRAINT "song_pericope_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_pericope_song_id_idx" ON "song_pericope" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "song_pericope_pericope_id_idx" ON "song_pericope" USING btree ("pericope_id");--> statement-breakpoint
-- Índice parcial p/ a fila de moderação (só o que está na comunidade).
CREATE INDEX "song_pericope_community_status_idx" ON "song_pericope" USING btree ("community_status") WHERE "community_status" <> 'none';--> statement-breakpoint
ALTER TABLE "song_pericope" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "song_pericope_select" ON "song_pericope" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("owner_id" = auth.uid() OR "community_status" = 'approved' OR ("community_status" = 'pending' AND public.is_moderator()));--> statement-breakpoint
CREATE POLICY "song_pericope_insert_own" ON "song_pericope" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "song_pericope_update_own" ON "song_pericope" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("owner_id" = auth.uid()) WITH CHECK ("owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "song_pericope_delete_own" ON "song_pericope" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("owner_id" = auth.uid());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "song_pericope" TO authenticated, service_role;