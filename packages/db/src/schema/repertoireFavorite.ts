import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { repertoire } from "./repertoire";
import { user } from "./user";

/**
 * Favorito de repertório — PESSOAL, por usuário (não é do dono). Cada músico tem a
 * sua lista, inclusive de repertórios de grupo de outras pessoas, para achar rápido na
 * home os que reaproveita (ex.: as Missas de meio de semana). Toggle: marcar = INSERT,
 * desmarcar = DELETE. PK composta (userId, repertoireId) impede duplicata.
 *
 * RLS:
 *  - SELECT: só as MINHAS linhas (user_id = auth.uid()).
 *  - ALL (write): idem — cada um só cria/apaga o próprio favorito.
 */
export const repertoireFavorite = pgTable(
  "repertoire_favorite",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    repertoireId: uuid("repertoire_id")
      .notNull()
      .references(() => repertoire.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // PK (userId, repertoireId): já indexa userId à frente (lista "meus favoritos").
    primaryKey({ columns: [t.userId, t.repertoireId] }),
    // Ajuda o cascade quando um repertório é apagado (varre por repertoire_id).
    index("repertoire_favorite_repertoire_idx").on(t.repertoireId),
    pgPolicy("repertoire_favorite_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid()`,
    }),
    pgPolicy("repertoire_favorite_write", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid()`,
      withCheck: sql`${t.userId} = auth.uid()`,
    }),
  ],
).enableRLS();
