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

/**
 * Ordem de projeção de UMA música: recebe a marcação de refrão de cada parágrafo
 * (`true` = refrão) e devolve os índices na sequência a projetar — o refrão
 * **entre as estrofes**, começando por ele. Ex.: `[R, E1, E2, E3]` →
 * `[R, E1, R, E2, R, E3]`. Sem refrão, devolve só as estrofes na ordem. O loop
 * (voltar ao começo depois da última) fica por conta de quem navega (módulo).
 */
export function projectionPlayOrder(chorus: boolean[]): number[] {
  const stanzas = chorus.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  const chorusIdx = chorus.indexOf(true);
  if (chorusIdx < 0) return stanzas; // sem refrão: só as estrofes
  if (stanzas.length === 0) return [chorusIdx]; // só refrão
  return stanzas.flatMap((st) => [chorusIdx, st]); // refrão antes de cada estrofe
}
