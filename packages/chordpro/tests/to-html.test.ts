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
});
