import { describe, expect, it } from "vitest";
import { momentTagNameForSlot } from "../src";

describe("momentTagNameForSlot", () => {
  it("slots cujo label difere do nome da tag: usa o alias", () => {
    // Estes dois têm label estendido no template, mas a tag de momento é curta.
    expect(momentTagNameForSlot("salmo", "Salmo Responsorial")).toBe("Salmo");
    expect(momentTagNameForSlot("aclamacao", "Aclamação ao Evangelho")).toBe("Aclamação");
  });

  it("slots cujo label já é o nome da tag: usa o próprio label", () => {
    expect(momentTagNameForSlot("entrada", "Entrada")).toBe("Entrada");
    expect(momentTagNameForSlot("comunhao", "Comunhão")).toBe("Comunhão");
    // 'Entrada da Bíblia' bate exatamente — normalizar por slug quebraria (key = entrada_biblia).
    expect(momentTagNameForSlot("entrada_biblia", "Entrada da Bíblia")).toBe("Entrada da Bíblia");
  });

  it("sem slot key (momento 'Livre'): cai no label", () => {
    expect(momentTagNameForSlot(null, "Qualquer")).toBe("Qualquer");
  });
});
