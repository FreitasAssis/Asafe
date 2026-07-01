import { describe, expect, it } from "vitest";
import { findExactTag, findSimilarTags } from "../src/tag-similarity";

const tags = (names: string[]) => names.map((name, i) => ({ id: String(i), name }));

describe("findSimilarTags", () => {
  it("acha a existente quando o novo nome está contido nela", () => {
    const out = findSimilarTags("Maria", tags(["Maria mãe", "Final"]));
    expect(out.map((t) => t.name)).toEqual(["Maria mãe"]);
  });

  it("acha quando a existente está contida no novo nome", () => {
    const out = findSimilarTags("Cordeiro de Deus", tags(["Cordeiro", "Entrada"]));
    expect(out.map((t) => t.name)).toEqual(["Cordeiro"]);
  });

  it("ignora acento e caixa (duplicata de fato)", () => {
    const out = findSimilarTags("maria", tags(["María"]));
    expect(out.map((t) => t.name)).toEqual(["María"]);
  });

  it("não acusa nomes sem relação", () => {
    expect(findSimilarTags("Advento", tags(["Aleluia", "Comunhão"]))).toEqual([]);
  });

  it("não faz ruído com nomes curtos (< 3 letras)", () => {
    expect(findSimilarTags("Pá", tags(["Páscoa"]))).toEqual([]);
    expect(findSimilarTags("Páscoa", tags(["Pá"]))).toEqual([]);
  });

  it("preserva o objeto da tag (id) e não retorna a si mesma vazia", () => {
    const out = findSimilarTags("Nossa Senhora", tags(["Nossa Senhora Aparecida"]));
    expect(out).toEqual([{ id: "0", name: "Nossa Senhora Aparecida" }]);
  });
});

describe("findExactTag", () => {
  it("acha a duplicata exata ignorando acento e caixa", () => {
    expect(findExactTag("maria", tags(["María"]))?.name).toBe("María");
    expect(findExactTag("  Páscoa ", tags(["pascoa"]))?.name).toBe("pascoa");
  });

  it("não confunde parecida com exata", () => {
    // "Maria" NÃO é duplicata exata de "Maria mãe".
    expect(findExactTag("Maria", tags(["Maria mãe"]))).toBeUndefined();
  });

  it("pega exata mesmo em nome curto (< 3 letras)", () => {
    // Diferente do aviso, a duplicata exata vale para qualquer tamanho.
    expect(findExactTag("Pá", tags(["pa"]))?.name).toBe("pa");
  });

  it("retorna undefined quando não há igual", () => {
    expect(findExactTag("Advento", tags(["Natal", "Páscoa"]))).toBeUndefined();
  });
});
