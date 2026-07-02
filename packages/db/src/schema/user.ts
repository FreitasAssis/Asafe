import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";
import { userRole } from "./enums";

/**
 * Perfil do usuário (espelho de auth.users), ver DESIGN.md §4/§5.
 * `id` referencia auth.users(id) com cascade; o perfil é populado por trigger
 * no signup (ver migration: public.handle_new_user / on_auth_user_created).
 */
export const user = pgTable(
  "user",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: userRole("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy("user_select_self", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.id} = auth.uid()`,
    }),
    pgPolicy("user_update_self", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.id} = auth.uid()`,
      withCheck: sql`${t.id} = auth.uid()`,
    }),
  ],
).enableRLS();
