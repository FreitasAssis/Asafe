CREATE TYPE "public"."moderation_reason" AS ENUM('autoria_status_incorreto', 'protegida_sem_permissao', 'duplicada', 'qualidade_cifra', 'outro');--> statement-breakpoint
ALTER TYPE "public"."community_status" ADD VALUE 'returned';--> statement-breakpoint
CREATE TABLE "moderation_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"moderator_id" uuid,
	"decision" text NOT NULL,
	"reason" "moderation_reason",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Só leitura para authenticated (a RLS filtra: moderador ou dono do alvo). A escrita é
-- exclusiva das funções moderate_* (security definer) → sem grant de INSERT ao cliente.
GRANT SELECT ON TABLE "moderation_event" TO authenticated, service_role;--> statement-breakpoint
ALTER TABLE "moderation_event" ADD CONSTRAINT "moderation_event_moderator_id_user_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_event_target_idx" ON "moderation_event" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE POLICY "moderation_event_select" ON "moderation_event" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_moderator()
        or ("moderation_event"."target_type" = 'song' and exists (select 1 from song s where s.id = "moderation_event"."target_id" and s.owner_id = auth.uid()))
        or ("moderation_event"."target_type" = 'repertoire' and exists (select 1 from repertoire r where r.id = "moderation_event"."target_id" and r.owner_id = auth.uid())));