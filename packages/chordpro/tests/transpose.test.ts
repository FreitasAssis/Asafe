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

  // Regressão: refrão não transpunha quando a cifra põe VÁRIOS acordes num colchete só
  // (ex.: "[E A B]GLÓRIA") — o ChordSheetJS não parseava "E A B" como um acorde e deixava
  // intacto, enquanto as estrofes (acorde único) transpunham.
  it("transpõe vários acordes dentro de um mesmo colchete (preservando o espaçamento)", () => {
    expect(transpose("[E   A   B]GLÓRIA", 1)).toBe("[F   A#   C]GLÓRIA");
    expect(transpose("[A/C# D]Kyrie [D4 D A]eleison", 1)).toBe("[A#/D D#]Kyrie [D#4 D# A#]eleison");
  });

  it("transpõe diminuto escrito com º/° e devolve o símbolo original", () => {
    expect(transpose("[A#º Bm]eleison", 1)).toBe("[Bº Cm]eleison");
  });

  it("token que não é acorde fica intacto", () => {
    expect(transpose("[*intro] [C]Ré", 2)).toBe("[*intro] [D]Ré");
  });
});
