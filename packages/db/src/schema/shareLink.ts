import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { repertoire } from "./repertoire";

/**
 * Link público de compartilhamento (ver DESIGN.md §4/§5).
 *
 * Um repertório pode ser aberto por um link público com token, SEM login.
 * O acesso público NÃO é mediado por RLS desta tabela: o visitante `anon`
 * NUNCA varre `repertoire`/`repertoire_item`. Ele chama as funções
 * `security definer` `get_shared_repertoire(p_token)` /
 * `get_shared_repertoire_items(p_token)` (anexadas à migration), que validam
 * o token e a validade (`expires_at`) e rodam como o dono, contornando o RLS.
 *
 * RLS desta tabela cobre apenas a GESTÃO dos links pelo DONO do repertório:
 *  - share_link_owner (ALL, authenticated): só o dono do repertório
 *    referenciado pode ler/criar/alterar/apagar o link.
 */
export const shareLink = pgTable(
  "share_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repertoireId: uuid("repertoire_id")
      .notNull()
      .references(() => repertoire.id),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scope: text("scope").notNull().default("read"),
  },
  (t) => [
    pgPolicy("share_link_owner", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and r.owner_id = auth.uid())`,
      withCheck: sql`exists (select 1 from repertoire r where r.id = ${t.repertoireId} and r.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
