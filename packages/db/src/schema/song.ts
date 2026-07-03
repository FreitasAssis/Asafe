import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { communityStatus, copyrightStatus, visibility } from "./enums";
import { user } from "./user";

/**
 * Música (ver DESIGN.md §4/§5).
 *
 * Conceito de catálogo (§5):
 *  - owner_id NULL  => item de catálogo global semeado (visível a todos os logados).
 *  - owner_id setado => item pessoal (apenas do dono) — até ir para a comunidade.
 *
 * Comunidade: `community_status='approved'` (aprovado direto pela moderação) OU estar
 * num repertório aprovado torna a música parte do **catálogo global** — a RLS deriva isso,
 * sem flag `is_global` para manter.
 */
export const song = pgTable(
  "song",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    composer: text("composer"),
    defaultKey: text("default_key"),
    // A cifra (chordpro_body) mora em `song_content` — separada por RLS (política de
    // direitos): referência aqui, conteúdo lá. Ver song_content.ts.
    audioLinks: text("audio_links")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ownerId: uuid("owner_id").references(() => user.id),
    visibility: visibility("visibility").notNull().default("private"),
    communityStatus: communityStatus("community_status").notNull().default("none"),
    // Direitos: decidido só no gate de promoção ao global (default assume protegida).
    // `copyright_evidence` = ponteiro/nota da prova (link da licença/permissão), não a prova.
    copyrightStatus: copyrightStatus("copyright_status").notNull().default("desconhecida"),
    copyrightEvidence: text("copyright_evidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Índice da FK usada nas subconsultas de RLS.
    index("song_owner_id_idx").on(t.ownerId),
    // Global = seed (owner nulo), própria, aprovada direto, ou dentro de um repertório aprovado.
    pgPolicy("song_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} is null OR ${t.ownerId} = auth.uid() OR ${t.communityStatus} = 'approved' OR exists (select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id where ri.song_id = ${t.id} and r.community_status = 'approved')`,
    }),
    // Membro de um grupo lê as músicas que estão num repertório compartilhado com o
    // grupo — para ver/co-editar o conteúdo (DESIGN/fatia E2). Permissiva = OR.
    pgPolicy("song_select_group", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id where ri.song_id = ${t.id} and r.group_id is not null and public.is_group_member(r.group_id))`,
    }),
    // Moderador lê músicas pendentes (submetidas direto OU dentro de um repertório pendente).
    pgPolicy("song_select_moderation", {
      for: "select",
      to: authenticatedRole,
      using: sql`public.is_moderator() and (${t.communityStatus} = 'pending' or exists (select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id where ri.song_id = ${t.id} and r.community_status = 'pending'))`,
    }),
    pgPolicy("song_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.ownerId} = auth.uid()`,
      withCheck: sql`${t.ownerId} = auth.uid()`,
    }),
  ],
).enableRLS();
