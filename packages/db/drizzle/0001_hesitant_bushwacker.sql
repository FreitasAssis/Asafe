-- 1) Tabela "group" (palavra reservada -> sempre entre aspas) + RLS habilitado.
CREATE TABLE "group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- 2) Tabela membership (PK composta) + RLS habilitado.
CREATE TABLE "membership" (
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'viewer' NOT NULL,
	CONSTRAINT "membership_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- FKs (membership precisa de "group" e "user" já existentes).
ALTER TABLE "group" ADD CONSTRAINT "group_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- 3) Função is_group_member: SECURITY DEFINER + STABLE, evita recursão de RLS
-- ao consultar membership a partir das políticas de SELECT. Como é language sql,
-- o corpo é validado na criação -> a tabela membership PRECISA já existir (acima).
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql security definer stable
set search_path = '' as $$
  select exists (
    select 1 from public.membership m
    where m.group_id = p_group_id and m.user_id = auth.uid()
  );
$$;
--> statement-breakpoint
-- 4) Políticas de "group" (a de SELECT usa a função criada acima).
CREATE POLICY "group_select_member" ON "group" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("group"."owner_id" = auth.uid() OR public.is_group_member("group"."id"));--> statement-breakpoint
CREATE POLICY "group_insert_owner" ON "group" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("group"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "group_modify_owner" ON "group" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("group"."owner_id" = auth.uid()) WITH CHECK ("group"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "group_delete_owner" ON "group" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("group"."owner_id" = auth.uid());--> statement-breakpoint
-- 5) Políticas de membership (SELECT usa a função; write exige ser dono do grupo).
CREATE POLICY "membership_select_member" ON "membership" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_group_member("membership"."group_id"));--> statement-breakpoint
CREATE POLICY "membership_write_owner" ON "membership" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from "group" g where g.id = "membership"."group_id" and g.owner_id = auth.uid())) WITH CHECK (exists (select 1 from "group" g where g.id = "membership"."group_id" and g.owner_id = auth.uid()));--> statement-breakpoint
-- 6) GRANTs de tabela: RLS filtra linhas, mas o PostgREST exige privilégio base.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "group" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "membership" TO "authenticated";
