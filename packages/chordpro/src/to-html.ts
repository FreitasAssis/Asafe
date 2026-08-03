import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { ensureChorusBlocks } from "./chorus";

/**
 * Renderiza um ChordPro como HTML estruturado (divs com classes `chord`/`lyrics`/...),
 * pronto para estilizar — usado no **preview ao vivo** do editor e na **página pública
 * SSR** de leitura (DESIGN §3/§7).
 *
 * O `HtmlDivFormatter` já marca o refrão como `<div class="paragraph chorus">` (por isso o
 * `ensureChorusBlocks`, que isola o bloco `{soc}/{eoc}`); o "Ao vivo" acha o refrão por essa
 * classe e ela dá o realce visual. Para o modo só-letra (esconder cifra / projeção), passe o
 * resultado de `stripChords`.
 */
export function toHtml(chordpro: string): string {
  const song = new ChordProParser().parse(ensureChorusBlocks(chordpro));
  return new HtmlDivFormatter().format(song);
}
