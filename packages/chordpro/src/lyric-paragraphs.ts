import { ChordProParser } from "chordsheetjs";
import { ensureChorusBlocks } from "./chorus";

/**
 * A **letra agrupada por parágrafo** (estrofe/refrão), sem acordes nem diretivas. Base do modo
 * Projeção em **slides**: cada parágrafo vira um slide (uma estrofe inteira ou o refrão inteiro).
 * O refrão marcado (`{start_of_chorus}`/`{end_of_chorus}`) fica isolado em seu próprio parágrafo.
 * Ver DESIGN §7. Cada item é a lista de linhas de letra não vazias do parágrafo.
 */
export function lyricParagraphs(chordpro: string): string[][] {
  const song = new ChordProParser().parse(ensureChorusBlocks(chordpro));
  return song.paragraphs
    .map((p) =>
      p.lines
        .map((line) =>
          line.items
            .map((it) => (it as { lyrics?: string }).lyrics ?? "")
            .join("")
            .replace(/\s+$/, ""),
        )
        .filter((l) => l.trim() !== ""),
    )
    .filter((para) => para.length > 0);
}
