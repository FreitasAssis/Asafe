import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { communityStatus } from "./enums";
import { pericope } from "./pericope";
import { song } from "./song";
import { user } from "./user";

/**
 * Vínculo música <-> leitura (perícope) — casa a música com o CONTEÚDO da
 * leitura (ver DESIGN.md §6). `suggested_moment` é o momento da Missa sugerido
 * (opcional). Segue o padrão "próprio + global/aprovado" de song/tag: o dono
 * cria o vínculo; sugerir globalização passa pela moderação (A4).
 *
 * RLS:
 *  - SELECT: do dono, OU aprovado (global), OU pendente visível a moderador.
 *  - INSERT/UPDATE/DELETE: apenas o dono (owner_id default auth.uid()).
 */
export const songPericope = pgTable(
  "song_pericope",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    songId: uuid("song_id")
      .notNull()
      .references(() => song.id, { onDelete: "cascade" }),
    pericopeId: uuid("pericope_id")
      .notNull()
      .references(() => pericope.id, { onDelete: "cascade" }),
    suggestedMoment: text("suggested_moment"),
    ownerId: uuid("owner_id")
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => user.id, { onDelete: "cascade" }),
    communityStatus: communityStatus("community_status").notNull().default("none"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("song_pericope_song_id_idx").on(t.songId),
    index("song_pericope_pericope_id_idx").on(t.pericopeId),
    index("song_pericope_community_status_idx")
      .on(t.communityStatus)
      .where(sql`${t.communityStatus} <> 'none'`),
    pgPolicy("song_pericope_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid() OR ${t.communityStatus} = 'approved' OR (${t.communityStatus} = 'pending' AND public.is_moderator())`,
    }),
    pgPolicy("song_pericope_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("song_pericope_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
    pgPolicy("song_pericope_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
