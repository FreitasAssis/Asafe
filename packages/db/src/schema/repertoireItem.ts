import { sql } from "drizzle-orm";
import { index, integer, pgPolicy, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { repertoire } from "./repertoire";
import { song } from "./song";

/**
 * Item de repertório (ver DESIGN.md §4/§5).
 * A sequência REAL do repertório mora aqui (uma linha por música/momento).
 *
 * RLS:
 *  - SELECT: espelha o acesso ao PAI (repertoire) — dono, membro do grupo, ou público.
 *  - INSERT/UPDATE/DELETE: DONO do pai OU EDITOR do grupo do pai
 *    (co-edição de conteúdo por membros owner/editor via public.is_group_editor).
 */
export const repertoireItem = pgTable(
  "repertoire_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repertoireId: uuid("repertoire_id")
      .notNull()
      .references(() => repertoire.id),
    songId: uuid("song_id")
      .notNull()
      .references(() => song.id),
    momentSlot: text("moment_slot"),
    order: integer("order").notNull(),
    transpose: integer("transpose").notNull().default(0),
    notes: text("notes"),
  },
  (t) => [
    // Índices das FKs usadas pelas subconsultas de RLS (evita seq scan por linha).
    index("repertoire_item_repertoire_id_idx").on(t.repertoireId),
    index("repertoire_item_song_id_idx").on(t.songId),
    pgPolicy("repertoire_item_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_member(r.group_id)) or r.community_status = 'approved' or (r.community_status = 'pending' and public.is_moderator())))`,
    }),
    pgPolicy("repertoire_item_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
    }),
    pgPolicy("repertoire_item_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
      withCheck: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
    }),
    pgPolicy("repertoire_item_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and (r.owner_id = auth.uid() or (r.group_id is not null and public.is_group_editor(r.group_id))))`,
    }),
  ],
).enableRLS();
