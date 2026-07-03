CREATE TYPE "public"."license_kind" AS ENUM('cc_by', 'cc_by_sa', 'permissao_asafe');--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "license" "license_kind";--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "consent_text_version" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "consented_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "consented_by" uuid;--> statement-breakpoint
ALTER TABLE "song" ADD CONSTRAINT "song_consented_by_user_id_fk" FOREIGN KEY ("consented_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Grava o consentimento de obra própria (§7) de forma robusta: horário e autor vêm do
-- servidor (now() + auth.uid()), só o dono da música. Marca copyright_status='licenca_aberta'.
CREATE OR REPLACE FUNCTION public.record_own_work_consent(
  p_song_id uuid, p_license text, p_consent_version text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  update public.song set
    copyright_status = 'licenca_aberta',
    license = p_license::public.license_kind,
    consent_text_version = p_consent_version,
    consented_at = now(),
    consented_by = auth.uid()
  where id = p_song_id and owner_id = auth.uid();
end; $$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_own_work_consent(uuid, text, text) TO authenticated;