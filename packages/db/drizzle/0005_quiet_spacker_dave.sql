-- Função is_group_editor: SECURITY DEFINER + STABLE, espelha is_group_member
-- mas restringe aos papéis owner/editor (co-edição de conteúdo do repertório).
-- language sql -> corpo validado na criação; a tabela membership já existe.
-- Criada ANTES das políticas abaixo, que a referenciam.
create or replace function public.is_group_editor(p_group_id uuid)
returns boolean language sql security definer stable
set search_path = '' as $$
  select exists (
    select 1 from public.membership m
    where m.group_id = p_group_id
      and m.user_id = auth.uid()
      and m.role in ('owner','editor')
  );
$$;
--> statement-breakpoint
DROP POLICY "repertoire_theme_write" ON "repertoire_theme" CASCADE;--> statement-breakpoint
CREATE POLICY "repertoire_theme_insert" ON "repertoire_theme" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id)))));--> statement-breakpoint
CREATE POLICY "repertoire_theme_update" ON "repertoire_theme" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))) WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id)))));--> statement-breakpoint
CREATE POLICY "repertoire_theme_delete" ON "repertoire_theme" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from repertoire r where r.id = "repertoire_theme"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id)))));--> statement-breakpoint
ALTER POLICY "repertoire_item_insert" ON "repertoire_item" TO authenticated WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id)))));--> statement-breakpoint
ALTER POLICY "repertoire_item_update" ON "repertoire_item" TO authenticated USING (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))) WITH CHECK (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id)))));--> statement-breakpoint
ALTER POLICY "repertoire_item_delete" ON "repertoire_item" TO authenticated USING (exists (select 1 from repertoire r where r.id = "repertoire_item"."repertoire_id" and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id)))));