import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { membershipRole } from "./enums";
import { group } from "./group";
import { user } from "./user";

/**
 * Vínculo usuário <-> grupo (ver PLANNING.md §5/§6).
 * PK composta (userId, groupId).
 *
 * RLS:
 *  - SELECT: membros do grupo (via public.is_group_member(group_id)).
 *  - ALL (write): somente o dono do grupo.
 */
export const membership = pgTable(
  "membership",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    groupId: uuid("group_id")
      .notNull()
      .references(() => group.id),
    role: membershipRole("role").notNull().default("viewer"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.groupId] }),
    pgPolicy("membership_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`public.is_group_member(${t.groupId})`,
    }),
    pgPolicy("membership_write_owner", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from "group" g where g.id = ${t.groupId} and g.owner_id = auth.uid())`,
      withCheck: sql`exists (select 1 from "group" g where g.id = ${t.groupId} and g.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
