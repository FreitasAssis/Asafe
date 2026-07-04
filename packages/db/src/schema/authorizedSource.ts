import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { user } from "./user";

/**
 * Fonte autorizada (C10 / DIREITOS-AUTORAIS §11): permissão **em bloco** de um
 * compositor/editora para suas obras — a fonte da verdade, vs. o palpite `KNOWN_PROTECTED`
 * (C6). Quando o compositor de uma música consta aqui, o gate sugere `permissao` (não
 * `protegida`) e o moderador vê o vínculo + evidência ao revisar.
 *
 * **Não auto-classifica**: cada música segue passando por moderação (postura conservadora
 * enquanto o §11 não formaliza os critérios). `composer_key` = compositor normalizado
 * (casa com normalizeTagName do core), indexado para a checagem do gate.
 *
 * RLS (mínimo privilégio): **só moderador lê/escreve a tabela**. O gate do proponente checa
 * um compositor específico pela função `authorized_source_for` (security definer) — assim ele
 * não consegue listar tudo, só ver a linha do autor que está submetendo.
 */
export const authorizedSource = pgTable(
  "authorized_source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    composer: text("composer").notNull(),
    composerKey: text("composer_key").notNull(),
    publisher: text("publisher"),
    evidence: text("evidence").notNull(),
    scope: text("scope"),
    createdBy: uuid("created_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("authorized_source_composer_key_idx").on(t.composerKey),
    // Só moderador lê/escreve a tabela (o gate usa a função authorized_source_for).
    pgPolicy("authorized_source_moderator", {
      for: "all",
      to: authenticatedRole,
      using: sql`public.is_moderator()`,
      withCheck: sql`public.is_moderator()`,
    }),
  ],
).enableRLS();
