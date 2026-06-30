import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { song } from "./song";
import { tag } from "./tag";

/**
 * Vínculo tag <-> música do catálogo global (ver PLANNING.md §5/§6).
 * PK composta (songId, tagId).
 *
 * RLS:
 *  - SELECT: liberado a todos os logados (using true).
 *  - Escrita (insert/delete): o usuário liga/desliga tags apenas nas SUAS músicas
 *    (own song). Vale para tags globais ou próprias. Curadoria sobre música global
 *    continua via service role. (Override de música global = user_song_tag_override.)
 */
export const songTag = pgTable(
  "song_tag",
  {
    songId: uuid("song_id")
      .notNull()
      .references(() => song.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id),
  },
  (t) => [
    primaryKey({ columns: [t.songId, t.tagId] }),
    pgPolicy("song_tag_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("song_tag_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from song s where s.id = ${t.songId} and s.owner_id = auth.uid())`,
    }),
    pgPolicy("song_tag_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from song s where s.id = ${t.songId} and s.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
