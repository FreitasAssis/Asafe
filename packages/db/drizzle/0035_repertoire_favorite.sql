-- Favorito de repertório PESSOAL (por usuário). Cada músico tem a sua lista — inclusive de
-- repertórios de grupo de outras pessoas — para achar rápido na home os que reaproveita.
CREATE TABLE "repertoire_favorite" (
	"user_id" uuid NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repertoire_favorite_user_id_repertoire_id_pk" PRIMARY KEY("user_id","repertoire_id")
);--> statement-breakpoint
ALTER TABLE "repertoire_favorite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "repertoire_favorite" ADD CONSTRAINT "repertoire_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_favorite" ADD CONSTRAINT "repertoire_favorite_repertoire_id_repertoire_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoire"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repertoire_favorite_repertoire_idx" ON "repertoire_favorite" USING btree ("repertoire_id");--> statement-breakpoint
CREATE POLICY "repertoire_favorite_select" ON "repertoire_favorite" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("repertoire_favorite"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "repertoire_favorite_write" ON "repertoire_favorite" AS PERMISSIVE FOR ALL TO "authenticated" USING ("repertoire_favorite"."user_id" = auth.uid()) WITH CHECK ("repertoire_favorite"."user_id" = auth.uid());--> statement-breakpoint
-- GRANT de tabela: a RLS filtra linhas, mas o PostgREST exige o privilégio base.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "repertoire_favorite" TO "authenticated";--> statement-breakpoint
-- `repertoires_mine()` ganha `favorite` = "EU favoritei este" (existe minha linha). Mudou a
-- assinatura (nova coluna no RETURNS TABLE) → DROP + CREATE + re-grant (o OR REPLACE não basta).
drop function if exists public.repertoires_mine();--> statement-breakpoint
create function public.repertoires_mine()
returns table(id uuid, title text, type public.repertoire_type, "date" date, owner_id uuid, community_status public.community_status, group_name text, liturgical_color text, favorite boolean)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.type, r.date, r.owner_id, r.community_status,
    (select string_agg(g.name, ', ' order by g.name)
       from public.repertoire_group rg join public."group" g on g.id = rg.group_id
       where rg.repertoire_id = r.id),
    r.liturgical_snapshot->>'color',
    exists (select 1 from public.repertoire_favorite f
            where f.repertoire_id = r.id and f.user_id = auth.uid())
  from public.repertoire r
  where r.owner_id = auth.uid() or public.in_repertoire_group(r.id)
  order by
    case when r.date is null then 2
         when r.date >= current_date then 0
         else 1 end,
    case when r.date >= current_date then r.date end asc,
    case when r.date < current_date then r.date end desc,
    r.title;
$$;--> statement-breakpoint
grant execute on function public.repertoires_mine() to authenticated;
