import {
  ChordProFormatter,
  ChordProParser,
  ChordsOverWordsParser,
} from "chordsheetjs";
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

  const song =
    format === "chordpro"
      ? new ChordProParser().parse(input)
      : new ChordsOverWordsParser().parse(input);

  return new ChordProFormatter().format(song);
}
