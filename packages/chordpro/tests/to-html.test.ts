import { describe, expect, it } from "vitest";
import { toHtml } from "../src/to-html";
import { stripChords } from "../src/strip-chords";

describe("toHtml", () => {
  it("renderiza acordes e letra como HTML estruturado", () => {
    const html = toHtml("[C]Amazing [G]grace");
    expect(html).toContain('class="chord">C');
    expect(html).toContain('class="chord">G');
    expect(html).toContain("Amazing");
    expect(html).toContain("grace");
  });

  it("compõe com stripChords para o modo só-letra (sem acordes no HTML)", () => {
    const html = toHtml(stripChords("[C]Amazing [G]grace"));
    expect(html).not.toContain('class="chord">C');
    expect(html).toContain("Amazing grace");
  });

  // Regressão: o realce do refrão vazava para a estrofe seguinte. O HtmlDivFormatter já marca
  // `<div class="paragraph chorus">`; só o refrão pode ter a classe.
  it("marca só o refrão com a classe chorus (não vaza p/ a estrofe seguinte)", () => {
    const html = toHtml("[C]Estrofe\n\n{start_of_chorus}\n[F]Refrão\n{end_of_chorus}\n[D]Estrofe dois");
    const paras = html.match(/<div class="paragraph[^"]*"/g) ?? [];
    expect(paras.filter((p) => p.includes("chorus"))).toHaveLength(1);
  });
});
