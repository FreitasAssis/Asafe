CREATE TYPE "public"."membership_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."repertoire_type" AS ENUM('Missa', 'Casamento', 'Adoracao', 'Terco', 'GrupoDeOracao', 'Sarau');--> statement-breakpoint
CREATE TYPE "public"."tag_category" AS ENUM('momento', 'tempo_liturgico', 'tema', 'ocasiao', 'fonte', 'salmo');--> statement-breakpoint
CREATE TYPE "public"."tag_override_action" AS ENUM('add', 'remove');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'group', 'public');--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- GRANTs de tabela: RLS filtra as linhas, mas o PostgREST exige privilégios base.
-- UPDATE é restrito À COLUNA email: 'role'/'created_at'/'id' NÃO são auto-editáveis
-- (senão um usuário faria PATCH role=admin e escalaria privilégio — ver §6).
GRANT SELECT ON TABLE "user" TO "authenticated";--> statement-breakpoint
GRANT UPDATE ("email") ON TABLE "user" TO "authenticated";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_select_self" ON "user" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_update_self" ON "user" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user"."id" = auth.uid()) WITH CHECK ("user"."id" = auth.uid());--> statement-breakpoint
-- Trigger de sincronização de perfil: popula public."user" no signup (auth.users insert).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public."user" (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
--> statement-breakpoint
revoke execute on function public.handle_new_user() from public;--> statement-breakpoint
drop trigger if exists on_auth_user_created on auth.users;--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();