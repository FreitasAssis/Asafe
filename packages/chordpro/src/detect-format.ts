/** Formato de entrada que o usuário colou (DESIGN §7). */
export type InputFormat = "chordpro" | "chords-over-lyrics" | "lyrics-only";

/** Acorde inline do ChordPro: `[C]`, `[G/B]`, `[Am7]` (conteúdo não-vazio). */
const CHORD_BRACKET = /\[[^\]\n]+\]/;

/**
 * Acorde isolado: raiz MAIÚSCULA A–G (+ acidente), sufixos conhecidos (m, maj, sus,
 * add, dim, aug, números, alterações b/# como em C#m7b5...) e baixo opcional (`/G`).
 * Estrutural de propósito: o `Chord.parse` do ChordSheetJS é leniente e aceitaria
 * "casa" como acorde — aqui "casa"/"sol" (minúsculo ou sufixo de letra arbitrária)
 * são rejeitados.
 */
const CHORD =
  /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|[mM°ø+#b\d-])*(?:\/[A-G][#b]?)?$/;

/** Uma linha é "de acordes" se todos os seus tokens são acordes (e há ao menos um). */
export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => CHORD.test(t));
}

/**
 * Detecta o formato de um texto colado pelo usuário:
 * - **chordpro**: tem acordes entre colchetes (`[C]`);
 * - **chords-over-lyrics**: tem ao menos uma linha só de acordes acima da letra;
 * - **lyrics-only**: nenhum acorde detectado.
 *
 * Armazenamos sempre em ChordPro; isto decide qual parser usar para normalizar.
 */
export function detectFormat(input: string): InputFormat {
  if (CHORD_BRACKET.test(input)) return "chordpro";
  if (input.split("\n").some(isChordLine)) return "chords-over-lyrics";
  return "lyrics-only";
}
