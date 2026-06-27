import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { song } from "./song";
import { tag } from "./tag";
import { tagOverrideAction } from "./enums";
import { user } from "./user";

/**
 * Override pessoal de tag por música (ver PLANNING.md §5/§6).
 * Permite ao usuário adicionar/remover, no seu contexto, uma tag global de uma
 * música global — armazenando apenas a diferença em relação ao catálogo.
 * PK composta (userId, songId, tagId).
 *
 * RLS:
 *  - ALL: apenas o próprio usuário (user_id = auth.uid()); ninguém mais lê ou
 *    escreve overrides alheios.
 */
export const userSongTagOverride = pgTable(
  "user_song_tag_override",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    songId: uuid("song_id")
      .notNull()
      .references(() => song.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id),
    action: tagOverrideAction("action").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.songId, t.tagId] }),
    pgPolicy("override_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.userId} = auth.uid()`,
      withCheck: sql`${t.userId} = auth.uid()`,
    }),
  ],
).enableRLS();
