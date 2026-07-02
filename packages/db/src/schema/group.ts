import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { user } from "./user";

/**
 * Grupo (ver DESIGN.md §4/§5). "group" é palavra reservada no SQL,
 * por isso a tabela é sempre referenciada com aspas ("group").
 *
 * RLS:
 *  - SELECT: somente membros (via public.is_group_member(id), security definer,
 *    evitando recursão de RLS com a tabela membership).
 *  - INSERT/UPDATE/DELETE: somente o dono (owner_id = auth.uid()).
 */
export const group = pgTable(
  "group",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy("group_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid() OR public.is_group_member(${t.id})`,
    }),
    pgPolicy("group_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("group_modify_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("group_delete_owner", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
