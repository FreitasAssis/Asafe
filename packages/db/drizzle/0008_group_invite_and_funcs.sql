-- Custom SQL migration file, put your code below! --

-- === Nome de exibição do usuário (fatia E2) ===
ALTER TABLE "user" ADD COLUMN "display_name" text;
--> statement-breakpoint
-- Trigger de perfil passa a gravar o nome informado no cadastro (metadata do signUp).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public."user" (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end; $$;
--> statement-breakpoint

-- === Membro pode SAIR do grupo (apaga a própria membership) ===
CREATE POLICY "membership_self_leave" ON "membership" AS PERMISSIVE FOR DELETE TO "authenticated"
  USING ("membership"."user_id" = auth.uid());
--> statement-breakpoint

-- === Convite por link ===
CREATE TABLE "group_invite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "token" text NOT NULL,
  "role" "membership_role" NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "group_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "group_invite" ADD CONSTRAINT "group_invite_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "group_invite" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE "group_invite" TO "authenticated";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "group_invite" TO "service_role";
--> statement-breakpoint
CREATE POLICY "group_invite_owner" ON "group_invite" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (exists (select 1 from "group" g where g.id = "group_invite"."group_id" and g.owner_id = auth.uid()))
  WITH CHECK (exists (select 1 from "group" g where g.id = "group_invite"."group_id" and g.owner_id = auth.uid()));
--> statement-breakpoint

-- === Pedido de entrada (aprovação) ===
CREATE TABLE "join_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "membership_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "join_request_group_user_unique" UNIQUE("group_id", "user_id")
);
--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_group_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "join_request" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, DELETE ON TABLE "join_request" TO "authenticated";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "join_request" TO "service_role";
--> statement-breakpoint
-- O solicitante vê/cancela o próprio pedido; o dono vê/recusa os do seu grupo.
CREATE POLICY "join_request_visible" ON "join_request" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("join_request"."user_id" = auth.uid() OR exists (select 1 from "group" g where g.id = "join_request"."group_id" and g.owner_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "join_request_delete" ON "join_request" AS PERMISSIVE FOR DELETE TO "authenticated"
  USING ("join_request"."user_id" = auth.uid() OR exists (select 1 from "group" g where g.id = "join_request"."group_id" and g.owner_id = auth.uid()));
--> statement-breakpoint

-- === Funções (security definer, search_path fixo) ===

-- Pedir para entrar via convite: cria um PEDIDO pendente (não vira membro ainda).
create or replace function public.request_join(p_token text)
returns jsonb language plpgsql security definer
set search_path = '' as $$
declare
  v_group_id uuid;
  v_role public.membership_role;
  v_name text;
begin
  select gi.group_id, gi.role into v_group_id, v_role
  from public.group_invite gi
  where gi.token = p_token and (gi.expires_at is null or gi.expires_at > now());
  if v_group_id is null then return null; end if;

  select g.name into v_name from public."group" g where g.id = v_group_id;

  if exists (select 1 from public.membership m where m.group_id = v_group_id and m.user_id = auth.uid()) then
    return jsonb_build_object('groupId', v_group_id, 'name', v_name, 'status', 'member');
  end if;

  insert into public.join_request (group_id, user_id, role)
  values (v_group_id, auth.uid(), v_role)
  on conflict (group_id, user_id) do nothing;

  return jsonb_build_object('groupId', v_group_id, 'name', v_name, 'status', 'pending');
end; $$;
--> statement-breakpoint
grant execute on function public.request_join(text) to authenticated;
--> statement-breakpoint

-- Membros de um grupo (nome + e-mail + papel) — só se o caller for membro.
create or replace function public.group_members(p_group_id uuid)
returns table(user_id uuid, name text, email text, role public.membership_role)
language sql security definer stable
set search_path = '' as $$
  select m.user_id, u.display_name, u.email, m.role
  from public.membership m
  join public."user" u on u.id = m.user_id
  where m.group_id = p_group_id
    and exists (select 1 from public.membership me where me.group_id = p_group_id and me.user_id = auth.uid());
$$;
--> statement-breakpoint
grant execute on function public.group_members(uuid) to authenticated;
--> statement-breakpoint

-- Pedidos pendentes de um grupo (nome + e-mail + papel) — só o dono.
create or replace function public.group_join_requests(p_group_id uuid)
returns table(user_id uuid, name text, email text, role public.membership_role)
language sql security definer stable
set search_path = '' as $$
  select jr.user_id, u.display_name, u.email, jr.role
  from public.join_request jr
  join public."user" u on u.id = jr.user_id
  where jr.group_id = p_group_id
    and exists (select 1 from public."group" g where g.id = p_group_id and g.owner_id = auth.uid());
$$;
--> statement-breakpoint
grant execute on function public.group_join_requests(uuid) to authenticated;
