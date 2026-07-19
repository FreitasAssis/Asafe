import { sql } from "drizzle-orm";
import { jsonb, pgPolicy, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

/**
 * Cache camada 2 — dicionário de leituras por POSIÇÃO litúrgica (ver DESIGN.md
 * §6), não pela data civil. Reutilizável entre anos: depois de ~2–3 anos quase
 * não se chama mais a API frágil. Chave (liturgical_key, cycle).
 *
 * RLS: leitura para qualquer logado; escrita só via `service_role` (ingestão A2).
 */
export const lectionary = pgTable(
  "lectionary",
  {
    liturgicalKey: text("liturgical_key").notNull(),
    cycle: text("cycle").notNull(),
    readings: jsonb("readings").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.liturgicalKey, t.cycle] }),
    pgPolicy("lectionary_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();
