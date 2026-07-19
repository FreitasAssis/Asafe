import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { communityStatus, repertoireType, visibility } from "./enums";
import { user } from "./user";

/**
 * Repertório (ver DESIGN.md §4/§5/§6).
 *
 * Vínculo com grupos é N-para-N via `repertoire_group` (#79) — não há mais
 * coluna `group_id`. A visibilidade de grupo é resolvida pela função
 * `in_repertoire_group(id)` (membro de QUALQUER grupo vinculado).
 *
 * Camada litúrgica (Fase 2, #27): `liturgical_key` (indexada, casa repertórios
 * entre anos) e `liturgical_snapshot` (cópia congelada da resolução na criação).
 *
 * RLS (políticas separadas por comando p/ clareza):
 *  - SELECT: dono, OU membro de algum grupo vinculado, OU público/aprovado,
 *    OU pendente visível a moderador.
 *  - INSERT/UPDATE/DELETE: apenas o dono (owner_id = auth.uid()).
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
    visibility: visibility("visibility").notNull().default("private"),
    communityStatus: communityStatus("community_status").notNull().default("none"),
    liturgicalKey: text("liturgical_key"),
    liturgicalSnapshot: jsonb("liturgical_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Índices das FKs/colunas usadas pelas subconsultas de RLS e pelas listas.
    index("repertoire_owner_id_idx").on(t.ownerId),
    index("repertoire_community_status_idx")
      .on(t.communityStatus)
      .where(sql`${t.communityStatus} <> 'none'`),
    // Casa repertórios da mesma celebração entre anos (Fase 2).
    index("repertoire_liturgical_key_idx").on(t.liturgicalKey),
    pgPolicy("repertoire_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid() OR public.in_repertoire_group(${t.id}) OR ${t.communityStatus} = 'approved' OR (${t.communityStatus} = 'pending' AND public.is_moderator())`,
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
