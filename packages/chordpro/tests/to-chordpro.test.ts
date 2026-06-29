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
});
