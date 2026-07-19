import { sql } from "drizzle-orm";
import { date, jsonb, pgPolicy, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

/**
 * Cache camada 1 — resolução do dia litúrgico (ver DESIGN.md §6). Específica do
 * ANO (a Páscoa é móvel), por isso a chave inclui a data civil + a nação.
 * O `data` jsonb guarda a resolução (tempo, cor, semana, ciclos, santo, chave
 * litúrgica derivada, referências das leituras).
 *
 * RLS: leitura para qualquer logado; escrita só via `service_role` (a ingestão
 * do A2 contorna a RLS) — sem policy de escrita (padrão `slot_template`).
 */
export const liturgicalDay = pgTable(
  "liturgical_day",
  {
    date: date("date").notNull(),
    nation: text("nation").notNull(),
    data: jsonb("data").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.nation] }),
    pgPolicy("liturgical_day_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();
