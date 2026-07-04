CREATE TABLE "authorized_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"composer" text NOT NULL,
	"composer_key" text NOT NULL,
	"publisher" text,
	"evidence" text NOT NULL,
	"scope" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "authorized_source" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "authorized_source" ADD CONSTRAINT "authorized_source_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authorized_source_composer_key_idx" ON "authorized_source" USING btree ("composer_key");--> statement-breakpoint
CREATE POLICY "authorized_source_moderator" ON "authorized_source" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_moderator()) WITH CHECK (public.is_moderator());--> statement-breakpoint
-- Tabela nova via drizzle não herda as default-privileges do Supabase: concede a DML
-- explicitamente (a RLS acima é quem restringe — só moderador lê/escreve a tabela).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "authorized_source" TO anon, authenticated, service_role;--> statement-breakpoint
-- O gate do proponente checa UM compositor (mínimo privilégio): a função devolve só a linha
-- que casa por chave normalizada, sem expor a lista inteira. Qualquer logado pode executar.
CREATE OR REPLACE FUNCTION public.authorized_source_for(p_composer_key text)
RETURNS TABLE (id uuid, composer text, publisher text, evidence text, scope text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  select id, composer, publisher, evidence, scope
  from public.authorized_source
  where composer_key = p_composer_key
  limit 1;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.authorized_source_for(text) TO authenticated;