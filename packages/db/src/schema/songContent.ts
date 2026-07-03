import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { song } from "./song";

/**
 * Conteúdo (cifra) de uma música — separado de `song` **de propósito** (política de
 * direitos): a RLS do Postgres é por linha, não por coluna, então o corpo mora numa
 * tabela própria para poder ser escondido enquanto a **referência** (linha de `song`)
 * segue visível à comunidade. Ver DIREITOS-AUTORAIS (política) e DESIGN.md §9.
 *
 * RLS de leitura — lê a cifra quem for:
 *  - **dono** da música;
 *  - **membro do grupo** de um repertório que a contém (grupo = conteúdo cheio);
 *  - quando a música é **livre** (`copyright_status ∈ {domínio público, licença aberta,
 *    permissão}`) **e** visível na **comunidade** (aprovada, direto ou via repertório);
 *  - **moderador** revisando item **pendente** (para avaliar a cifra).
 * Escrita: só o **dono**.
 *
 * PK em `song_id` já cobre o join/lookup — sem índice extra.
 */
export const songContent = pgTable(
  "song_content",
  {
    songId: uuid("song_id")
      .primaryKey()
      .references(() => song.id, { onDelete: "cascade" }),
    chordproBody: text("chordpro_body"),
  },
  (t) => [
    pgPolicy("song_content_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from song s where s.id = ${t.songId} and (
          s.owner_id = auth.uid()
          or exists (
            select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id
            where ri.song_id = s.id and r.group_id is not null and public.is_group_member(r.group_id)
          )
          or (
            s.copyright_status in ('dominio_publico','licenca_aberta','permissao')
            and (
              s.community_status = 'approved'
              or exists (
                select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id
                where ri.song_id = s.id and r.community_status = 'approved'
              )
            )
          )
          or (
            public.is_moderator() and (
              s.community_status = 'pending'
              or exists (
                select 1 from repertoire_item ri join repertoire r on r.id = ri.repertoire_id
                where ri.song_id = s.id and r.community_status = 'pending'
              )
            )
          )
        )
      )`,
    }),
    pgPolicy("song_content_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from song s where s.id = ${t.songId} and s.owner_id = auth.uid())`,
      withCheck: sql`exists (select 1 from song s where s.id = ${t.songId} and s.owner_id = auth.uid())`,
    }),
  ],
).enableRLS();
