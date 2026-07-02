import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { communityStatus, repertoireType, visibility } from "./enums";
import { group } from "./group";
import { user } from "./user";

/**
 * Repertório (ver DESIGN.md §4/§5).
 *
 * MVP (Fase 1): SEM colunas litúrgicas (liturgical_key/liturgical_snapshot),
 * que entram aditivas na Fase 2.
 *
 * RLS (políticas separadas por comando p/ clareza):
 *  - SELECT: dono, OU membro do grupo (group_id setado), OU público.
 *  - INSERT/UPDATE/DELETE: apenas o dono (owner_id = auth.uid()).
 *    O dono sempre enxerga via SELECT (cobre o RETURNING do INSERT).
 */
export const repertoire = pgTable(
  "repertoire",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: repertoireType("type").notNull(),
    date: date("date"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id),
    groupId: uuid("group_id").references(() => group.id),
    visibility: visibility("visibility").notNull().default("private"),
    communityStatus: communityStatus("community_status").notNull().default("none"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Índices das FKs usadas pelas subconsultas de RLS; o parcial serve às listas
    // de moderação (só linhas que estão na comunidade).
    index("repertoire_owner_id_idx").on(t.ownerId),
    index("repertoire_group_id_idx").on(t.groupId),
    index("repertoire_community_status_idx")
      .on(t.communityStatus)
      .where(sql`${t.communityStatus} <> 'none'`),
    pgPolicy("repertoire_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid() OR (${t.groupId} is not null AND public.is_group_member(${t.groupId})) OR ${t.communityStatus} = 'approved' OR (${t.communityStatus} = 'pending' AND public.is_moderator())`,
    }),
    pgPolicy("repertoire_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("repertoire_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("repertoire_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
