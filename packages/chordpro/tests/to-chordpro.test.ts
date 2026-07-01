import { describe, expect, it } from "vitest";
import { toChordPro } from "../src/to-chordpro";

describe("toChordPro", () => {
  it("converte acordes sobre a letra em ChordPro inline", () => {
    const input = "C       G\nAmazing grace";
    expect(toChordPro(input)).toBe("[C]Amazing [G]grace");
  });

  it("normaliza ChordPro já existente (round-trip estável)", () => {
    expect(toChordPro("[C]Amazing [G]grace")).toBe("[C]Amazing [G]grace");
  });

  it("mantém só-letra sem inventar acordes", () => {
    const out = toChordPro("Amazing grace, how sweet");
    expect(out).toContain("Amazing grace, how sweet");
    expect(out).not.toContain("[");
  });

  it("respeita o formato informado explicitamente", () => {
    // Forçando 'lyrics-only', não tenta interpretar a linha como acordes.
    expect(toChordPro("C G", "lyrics-only")).toBe("C G");
  });

  it("não descarta acordes alterados de uma cifra colada (F°7, G7+, C#m7b5)", () => {
    // Regressão: cifras reais sumiam porque o parser do ChordSheetJS rejeitava
    // esses acordes. O nosso conversor preserva a notação exata.
    const out = toChordPro("F°7    G7+\nSou trigo do Senhor");
    expect(out).toContain("[F°7]");
    expect(out).toContain("[G7+]");

    const santo = toChordPro("C#m7b5   F#7\nSanto, Santo, Santo");
    expect(santo).toContain("[C#m7b5]");
  });
});
