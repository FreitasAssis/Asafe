CREATE TABLE "share_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"scope" text DEFAULT 'read' NOT NULL,
	CONSTRAINT "share_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "share_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_repertoire_id_repertoire_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoire"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "share_link_owner" ON "share_link" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "share_link"."repertoire_id" and r.owner_id = auth.uid())) WITH CHECK (exists (select 1 from repertoire r where r.id = "share_link"."repertoire_id" and r.owner_id = auth.uid()));--> statement-breakpoint
-- GRANTs de tabela: RLS filtra linhas, mas o PostgREST exige privilégio base.
-- (Este Supabase local não auto-expõe tabelas novas.) Só o DONO (authenticated)
-- gerencia seus links; NÃO há GRANT para anon — o visitante usa só as RPCs abaixo.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "share_link" TO "authenticated";--> statement-breakpoint
-- service_role contorna RLS, mas ainda exige privilégio base na tabela.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "share_link" TO "service_role";--> statement-breakpoint
-- Acesso público por token (PLANNING.md §6/§8): funções SECURITY DEFINER que
-- validam o token + validade (expires_at) e devolvem só aquele repertório/itens.
-- Rodam como o dono (postgres), contornando o RLS internamente -> o `anon` só
-- precisa do EXECUTE, NUNCA de SELECT em repertoire/repertoire_item.
-- (language sql -> corpo validado na criação: as tabelas referenciadas já existem.)
create or replace function public.get_shared_repertoire(p_token text)
returns setof public.repertoire language sql security definer stable
set search_path = '' as $$
  select r.* from public.repertoire r
  join public.share_link s on s.repertoire_id = r.id
  where s.token = p_token and (s.expires_at is null or s.expires_at > now());
$$;
--> statement-breakpoint
create or replace function public.get_shared_repertoire_items(p_token text)
returns setof public.repertoire_item language sql security definer stable
set search_path = '' as $$
  select i.* from public.repertoire_item i
  join public.share_link s on s.repertoire_id = i.repertoire_id
  where s.token = p_token and (s.expires_at is null or s.expires_at > now());
$$;
--> statement-breakpoint
-- EXECUTE para anon E authenticated: o visitante do link (anon) e o dono logado
-- podem abrir o repertório via RPC. O acesso à tabela continua negado ao anon.
grant execute on function public.get_shared_repertoire(text) to anon, authenticated;--> statement-breakpoint
grant execute on function public.get_shared_repertoire_items(text) to anon, authenticated;