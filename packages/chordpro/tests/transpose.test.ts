import { describe, expect, it } from "vitest";
import { transpose } from "../src/transpose";

const HINO = "[C]Amazing [Am]grace [F]how [G]sweet";

describe("transpose", () => {
  it("sobe N semitons (+2: C→D, Am→Bm, F→G, G→A)", () => {
    expect(transpose(HINO, 2)).toBe("[D]Amazing [Bm]grace [G]how [A]sweet");
  });

  it("desce N semitons (−1: C→B, F→E)", () => {
    expect(transpose(HINO, -1)).toBe("[B]Amazing [Abm]grace [E]how [Gb]sweet");
  });

  it("transpor por 0 é identidade", () => {
    expect(transpose(HINO, 0)).toBe(HINO);
  });

  it("transpor por uma oitava (12) volta aos mesmos acordes", () => {
    expect(transpose(HINO, 12)).toBe(HINO);
  });

  it("preserva a letra", () => {
    expect(transpose("[C]Vem, ó [G]Espírito", 2)).toContain("Vem, ó");
  });
});
