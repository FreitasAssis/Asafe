import { describe, expect, it } from "vitest";
import { stripChords } from "../src/strip-chords";

describe("stripChords", () => {
  it("remove os acordes, preservando a letra e os espaços", () => {
    expect(stripChords("[C]Amazing [G]grace")).toBe("Amazing grace");
  });

  it("remove acordes no meio da linha", () => {
    expect(stripChords("Vem, ó [G]Espírito")).toBe("Vem, ó Espírito");
  });

  it("preserva texto que já é só letra", () => {
    expect(stripChords("Amazing grace, how sweet")).toBe(
      "Amazing grace, how sweet",
    );
  });

  it("preserva quebras de linha", () => {
    expect(stripChords("[C]Linha um\n[G]Linha dois")).toBe(
      "Linha um\nLinha dois",
    );
  });

  it("não toca em diretivas {…} (não são acordes)", () => {
    expect(stripChords("{title: Hino}\n[C]Letra")).toBe("{title: Hino}\nLetra");
  });
});
