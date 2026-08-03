import { Chord } from "chordsheetjs";

/**
 * Transpõe um ChordPro por `semitones` (+ sobe, − desce). É a transposição por ocorrência do
 * modo palco / do `repertoire_item` (DESIGN §7): não altera o arranjo, só o tom de exibição.
 *
 * Vai **token a token dentro de cada colchete** `[...]`, então cobre também o estilo comum de
 * "vários acordes num colchete só" (`[E   A   B]GLÓRIA`) — que o transpose do ChordSheetJS
 * deixava intacto por não parsear `"E A B"` como um único acorde, enquanto as estrofes de
 * acorde único transpunham (o bug do refrão). Preserva o espaçamento; tokens que não são
 * acorde (anotações, símbolos) ficam como estão. Imutável — devolve um novo ChordPro.
 */
export function transpose(chordpro: string, semitones: number): string {
  if (!semitones) return chordpro;
  return chordpro.replace(/\[([^\]]*)\]/g, (_m, inner: string) => {
    const moved = inner.replace(/\S+/g, (token) => transposeToken(token, semitones));
    return `[${moved}]`;
  });
}

/** Transpõe um único token de acorde; devolve intacto se não for acorde. */
function transposeToken(token: string, semitones: number): string {
  // `º`/`°` (diminuto) não são parseados pelo ChordSheetJS → normaliza p/ "o", transpõe e
  // devolve o símbolo que o usuário digitou.
  const dimSym = /[º°]/.exec(token)?.[0];
  const chord = Chord.parse(dimSym ? token.replace(/[º°]/g, "o") : token);
  if (!chord) return token;
  const out = chord.transpose(semitones).toString();
  return dimSym ? out.replace(/o$/, dimSym) : out;
}
