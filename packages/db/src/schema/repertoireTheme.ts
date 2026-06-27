import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { repertoire } from "./repertoire";
import { tag } from "./tag";

/**
 * Tema do repertório (ver PLANNING.md §5/§6).
 * Âncora por tema (tag) para tipos não-litúrgicos.
 * PK composta (repertoireId, tagId).
 *
 * RLS (espelha o pai):
 *  - SELECT: mesma condição de visibilidade do pai (dono, membro, ou público).
 *  - INSERT/UPDATE/DELETE: DONO do pai OU EDITOR do grupo do pai
 *    (co-edição de conteúdo por membros owner/editor via public.is_group_editor).
 *    A policy ALL antiga foi dividida por comando para que o SELECT continue
 *    "membro do grupo lê" enquanto a ESCRITA é "dono OU editor do grupo".
 */
export const repertoireTheme = pgTable(
  "repertoire_theme",
  {
    repertoireId: uuid("repertoire_id")
      .notNull()
      .references(() => repertoire.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id),
  },
  (t) => [
    primaryKey({ columns: [t.repertoireId, t.tagId] }),
    pgPolicy("repertoire_theme_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id)) or r.visibility = 'public'))`,
    }),
    pgPolicy("repertoire_theme_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
    }),
    pgPolicy("repertoire_theme_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
      withCheck: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
    }),
    pgPolicy("repertoire_theme_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
    }),
  ],
).enableRLS();
