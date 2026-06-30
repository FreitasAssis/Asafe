import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { visibility } from "./enums";
import { user } from "./user";

/**
 * Música (ver PLANNING.md §5/§6).
 *
 * Conceito de catálogo (§5):
 *  - owner_id NULL  => item de catálogo global (visível a todos os logados).
 *  - owner_id setado => item pessoal (apenas do dono).
 *
 * RLS:
 *  - SELECT: catálogo global (owner_id is null) OU própria (owner_id = auth.uid()).
 *  - ALL (write): apenas o dono (owner_id = auth.uid()); catálogo global é
 *    semeado/curado via service role (que contorna RLS).
 */
export const song = pgTable(
  "song",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    composer: text("composer"),
    defaultKey: text("default_key"),
    chordproBody: text("chordpro_body"),
    audioLinks: text("audio_links")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ownerId: uuid("owner_id").references(() => user.id),
    visibility: visibility("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy("song_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} is null OR ${t.ownerId} = auth.uid()`,
    }),
    // Membro de um grupo lê as músicas que estão num repertório compartilhado com o
    // grupo — para ver/co-editar o conteúdo (DESIGN/fatia E2). Permissiva = OR.
    pgPolicy("song_select_group", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id where ri.song_id = ${t.id} and r.group_id is not null and public.is_group_member(r.group_id))`,
    }),
    pgPolicy("song_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
