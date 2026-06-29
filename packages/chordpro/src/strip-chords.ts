/** Acordes inline do ChordPro (`[C]`, `[G/B]`). */
const CHORD_BRACKETS = /\[[^\]]*\]/g;

/**
 * Remove os acordes de um ChordPro, deixando só a letra — base do modo "esconder
 * cifra" (para quem só canta) e do **modo projeção** (letra grande no telão, DESIGN §7).
 * Diretivas `{…}` não são acordes e são preservadas.
 */
export function stripChords(chordpro: string): string {
  return chordpro.replace(CHORD_BRACKETS, "");
}
