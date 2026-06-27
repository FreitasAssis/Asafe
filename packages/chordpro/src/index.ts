/**
 * @asafe/chordpro — wrappers do ChordSheetJS para o Asafe (ver PLANNING.md §8).
 *
 * Armazenamos internamente em ChordPro (dá transposição, esconder cifra, reflow).
 * Os wrappers de alto nível (parse de "acordes sobre a letra", transpose por semitons,
 * hideChords, detectFormat) entram na Fase 1 via TDD — este é o ponto de entrada.
 */
export * as ChordSheetJS from "chordsheetjs";
