import { ChordProParser } from "chordsheetjs";
import { ensureChorusBlocks } from "./chorus";

/** Um parágrafo de letra (estrofe ou refrão) — um slide na Projeção. */
export interface LyricParagraph {
  lines: string[];
  /** É o refrão marcado (`{start_of_chorus}`/`{end_of_chorus}`)? */
  chorus: boolean;
}

/**
 * A **letra agrupada por parágrafo** (estrofe/refrão), sem acordes nem diretivas. Base do modo
 * Projeção em **slides**: cada parágrafo vira um slide (uma estrofe inteira ou o refrão inteiro),
 * marcando qual é o refrão (para o botão "Refrão"). Ver DESIGN §7.
 */
export function lyricParagraphs(chordpro: string): LyricParagraph[] {
  const song = new ChordProParser().parse(ensureChorusBlocks(chordpro));
  return song.paragraphs
    .map((p) => ({
      chorus: p.type === "chorus",
      lines: p.lines
        .map((line) =>
          line.items
            .map((it) => (it as { lyrics?: string }).lyrics ?? "")
            .join("")
            .replace(/\s+$/, ""),
        )
        .filter((l) => l.trim() !== ""),
    }))
    .filter((para) => para.lines.length > 0);
}
