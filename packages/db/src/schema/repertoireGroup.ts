import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { group } from "./group";
import { repertoire } from "./repertoire";

/**
 * Vínculo N-para-N repertório <-> grupo (#79). Um repertório pode ser
 * compartilhado com vários grupos; membro de QUALQUER um deles o vê.
 * PK composta (repertoireId, groupId). Ver DESIGN.md §5.
 *
 * RLS:
 *  - SELECT: só vínculos de repertórios que o usuário já enxerga (amarrado à
 *    RLS de `repertoire`).
 *  - ALL (write): apenas o dono do repertório liga/desliga grupos.
 */
export const repertoireGroup = pgTable(
  "repertoire_group",
  {
    repertoireId: uuid("repertoire_id")
      .notNull()
      .references(() => repertoire.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.repertoireId, t.groupId] }),
    index("repertoire_group_repertoire_idx").on(t.repertoireId),
    index("repertoire_group_group_idx").on(t.groupId),
    pgPolicy("repertoire_group_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or public.in_repertoire_group(r.id) or r.community_status = 'approved'))`,
    }),
    pgPolicy("repertoire_group_write_owner", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.repertoire r where r.id = ${t.repertoireId} and r.owner_id = auth.uid())`,
      withCheck: sql`exists (select 1 from public.repertoire r where r.id = ${t.repertoireId} and r.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
