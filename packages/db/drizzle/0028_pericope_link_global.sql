-- A4b — Vínculo música↔leitura passa a ser GLOBAL, com fila de moderação REATIVA.
--
-- Inverte o padrão do resto do app: aqui 'pending' JÁ É PÚBLICO. O vínculo nasce
-- visível a todos e entra na fila só para o moderador triar — que então REMOVE o
-- vínculo ou APROVA (o que significa apenas tirar da fila; nada muda para quem vê).
--
-- Vincular também PUBLICA A REFERÊNCIA da música (título/autor). A cifra continua
-- fechada: `song_content` tem RLS própria (dono / grupo / copyright) — é a
-- separação "referência × conteúdo" do épico de direitos (DESIGN §11).

-- ── song_pericope: nasce na fila, mas já público ─────────────────────────────
ALTER TABLE "song_pericope" ALTER COLUMN "community_status" SET DEFAULT 'pending';--> statement-breakpoint

-- Todo logado vê todos os vínculos (são globais por desenho).
ALTER POLICY "song_pericope_select" ON "song_pericope" TO "authenticated" USING (true);--> statement-breakpoint

-- Remoção e edição: o dono OU um moderador (que pode remover qualquer vínculo e
-- aprovar para tirar da fila). Os nomes antigos diziam "own" — trocados.
DROP POLICY IF EXISTS "song_pericope_delete_own" ON "song_pericope";--> statement-breakpoint
CREATE POLICY "song_pericope_delete" ON "song_pericope" AS PERMISSIVE FOR DELETE TO "authenticated"
  USING ("owner_id" = auth.uid() OR public.is_moderator());--> statement-breakpoint
DROP POLICY IF EXISTS "song_pericope_update_own" ON "song_pericope";--> statement-breakpoint
CREATE POLICY "song_pericope_update" ON "song_pericope" AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING ("owner_id" = auth.uid() OR public.is_moderator())
  WITH CHECK ("owner_id" = auth.uid() OR public.is_moderator());--> statement-breakpoint

-- ── song: vincular publica a REFERÊNCIA (metadado), nunca a cifra ────────────
-- Policy permissiva nova (soma às demais): música com vínculo tem o metadado
-- legível. `song_content` não é tocada, então a cifra segue gatilhada à parte.
CREATE POLICY "song_select_pericope" ON "song" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (exists (select 1 from public.song_pericope sp where sp.song_id = "song"."id"));--> statement-breakpoint

-- ── índice para o casamento por sobreposição ────────────────────────────────
-- A consulta estreita por (livro, capítulo) e a interseção fina roda no core.
CREATE INDEX "pericope_segment_book_chapter_idx" ON "pericope_segment" USING btree ("book", "chapter");