/**
 * @asafe/chordpro — engine de ChordPro do Asafe (DESIGN §7).
 *
 * Armazenamos sempre em ChordPro (dá transposição, esconder cifra, reflow); o usuário
 * cola no formato que conhecer e a engine normaliza. Cada função fica num arquivo por
 * contexto; este index é o barril público do pacote.
 */
export * from "./detect-format";
export * from "./chords-over-words";
export * from "./to-chordpro";
export * from "./transpose";
export * from "./strip-chords";
export * from "./to-html";
