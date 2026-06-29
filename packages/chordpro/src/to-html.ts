import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";

/**
 * Renderiza um ChordPro como HTML estruturado (divs com classes `chord`/`lyrics`/...),
 * pronto para estilizar — usado no **preview ao vivo** do editor e na **página pública
 * SSR** de leitura (DESIGN §3/§7).
 *
 * Para o modo só-letra (esconder cifra / projeção), passe o resultado de `stripChords`.
 */
export function toHtml(chordpro: string): string {
  const song = new ChordProParser().parse(chordpro);
  return new HtmlDivFormatter().format(song);
}
