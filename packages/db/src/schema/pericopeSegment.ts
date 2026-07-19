import { sql } from "drizzle-orm";
import { index, integer, pgPolicy, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { pericope } from "./pericope";

/**
 * Segmento de perícope — um intervalo (livro/capítulo/versículos) da leitura
 * (ver DESIGN.md §6). Uma perícope tem N segmentos (ex.: "Lc 15,1-3.11-32" = 2),
 * o que permite ao A4 casar leituras por INTERSEÇÃO de intervalos, não por
 * string igual.
 *
 * RLS: segue a visibilidade da perícope-pai; escrita só na própria perícope.
 */
export const pericopeSegment = pgTable(
  "pericope_segment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pericopeId: uuid("pericope_id")
      .notNull()
      .references(() => pericope.id, { onDelete: "cascade" }),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    verseStart: integer("verse_start").notNull(),
    verseEnd: integer("verse_end").notNull(),
  },
  (t) => [
    index("pericope_segment_pericope_id_idx").on(t.pericopeId),
    pgPolicy("pericope_segment_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.pericope p where p.id = ${t.pericopeId})`,
    }),
    pgPolicy("pericope_segment_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.pericope p where p.id = ${t.pericopeId} and p.owner_id = auth.uid())`,
      withCheck: sql`exists (select 1 from public.pericope p where p.id = ${t.pericopeId} and p.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
