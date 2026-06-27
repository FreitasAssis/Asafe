import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { tagCategory } from "./enums";
import { user } from "./user";

/**
 * Tag (ver PLANNING.md §5/§6).
 *
 * Conceito de catálogo (§5):
 *  - owner_id NULL  => tag de catálogo global (visível a todos os logados).
 *  - owner_id setado => tag pessoal (apenas do dono).
 *
 * RLS:
 *  - SELECT: catálogo global (owner_id is null) OU própria (owner_id = auth.uid()).
 *  - ALL (write): apenas o dono (owner_id = auth.uid()); catálogo global é
 *    semeado/curado via service role (que contorna RLS).
 */
export const tag = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: tagCategory("category").notNull(),
    ownerId: uuid("owner_id").references(() => user.id),
  },
  (t) => [
    pgPolicy("tag_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} is null OR ${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("tag_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
