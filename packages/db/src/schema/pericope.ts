import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { user } from "./user";

/**
 * Perícope — identidade de uma leitura (ver DESIGN.md §6). O `label` é o rótulo
 * humano (ex.: "Lc 15,11-32"); a decomposição em intervalos fica em
 * `pericope_segment` (usada pelo resgate por sobreposição do A4).
 *
 * Conceito de catálogo (como `tag`):
 *  - owner_id NULL  => catálogo global (curado via service_role).
 *  - owner_id setado => própria (default auth.uid()).
 *
 * RLS: SELECT global OU própria; write só do dono.
 */
export const pericope = pgTable(
  "pericope",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    ownerId: uuid("owner_id")
      .default(sql`auth.uid()`)
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pericope_owner_id_idx").on(t.ownerId),
    pgPolicy("pericope_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} is null OR ${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("pericope_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
