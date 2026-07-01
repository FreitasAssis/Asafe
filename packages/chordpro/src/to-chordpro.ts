import { ChordProFormatter, ChordProParser } from "chordsheetjs";
import { chordsOverWordsToChordPro } from "./chords-over-words";
import { detectFormat, type InputFormat } from "./detect-format";

/**
 * Normaliza qualquer entrada do usuário para **ChordPro** — o formato de
 * armazenamento interno (DESIGN §7). O usuário cola no formato que conhecer
 * (acordes sobre a letra, ChordPro, ou só letra) e guardamos sempre em ChordPro.
 *
 * `format` é detectado automaticamente; pode ser forçado (ex.: tratar como só letra).
 */
export function toChordPro(
  input: string,
  format: InputFormat = detectFormat(input),
): string {
  // Só letra já é ChordPro válido (sem acordes) — não passa pelo parser para não
  // arriscar reinterpretar a letra como acordes.
  if (format === "lyrics-only") return input;

  // Acordes sobre a letra: conversor próprio, que preserva a notação exata do
  // usuário (F°7, G7+, C#m7b5) — o ChordsOverWordsParser do ChordSheetJS descartava
  // acordes alterados e sumia com cifras inteiras.
  if (format === "chords-over-lyrics") return chordsOverWordsToChordPro(input);

  // ChordPro já existente: normaliza via round-trip do ChordSheetJS.
  const song = new ChordProParser().parse(input);
  return new ChordProFormatter().format(song);
}
