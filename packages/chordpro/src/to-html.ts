import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { ensureChorusBlocks } from "./chorus";

/**
 * Renderiza um ChordPro como HTML estruturado (divs com classes `chord`/`lyrics`/...),
 * pronto para estilizar — usado no **preview ao vivo** do editor e na **página pública
 * SSR** de leitura (DESIGN §3/§7).
 *
 * Para o modo só-letra (esconder cifra / projeção), passe o resultado de `stripChords`.
 */
export function toHtml(chordpro: string): string {
  const song = new ChordProParser().parse(ensureChorusBlocks(chordpro));
  const html = new HtmlDivFormatter().format(song);
  // O HtmlDivFormatter não distingue o refrão. Como as divs de parágrafo saem na MESMA ordem
  // de `song.paragraphs`, taggeamos as do refrão com a classe `chorus` — assim o modo "Ao
  // vivo" acha o bloco e pula pra ele (e dá pra realçar visualmente). Ver DESIGN §7.
  let i = -1;
  return html.replaceAll('<div class="paragraph"', () => {
    i += 1;
    return song.paragraphs[i]?.type === "chorus"
      ? '<div class="paragraph chorus"'
      : '<div class="paragraph"';
  });
}
