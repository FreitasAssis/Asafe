import { ChordProFormatter, ChordProParser } from "chordsheetjs";

/**
 * Transpõe um ChordPro por `semitones` (+ sobe, − desce). É a transposição por
 * ocorrência do modo palco / do `repertoire_item` (DESIGN §7): não altera o arranjo,
 * só o tom de exibição. Imutável — devolve um novo ChordPro.
 */
export function transpose(chordpro: string, semitones: number): string {
  const song = new ChordProParser().parse(chordpro).transpose(semitones);
  return new ChordProFormatter().format(song);
}
