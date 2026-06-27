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
 *  - SELECT: liberado a todos os logados (using true). O vínculo só faz sentido
 *    sobre itens de catálogo global, então não há vazamento de dados pessoais.
 *  - Escrita: curadoria/admin via service role (que contorna RLS); não há policy
 *    de escrita para authenticated nesta etapa.
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
  ],
).enableRLS();
