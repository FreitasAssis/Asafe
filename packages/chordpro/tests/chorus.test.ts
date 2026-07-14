import { describe, expect, it } from "vitest";
import { toHtml } from "../src/to-html";
import { hasChorus } from "../src/chorus";
import { toChordPro } from "../src/to-chordpro";

describe("toHtml — marca o refrão", () => {
  it("o bloco {soc}/{eoc} vira uma div com classe chorus", () => {
    const html = toHtml("[C]Verso\n\n{start_of_chorus}\n[G]Refrão aqui\n{end_of_chorus}\n\n[C]Outro");
    expect(html).toContain('class="paragraph chorus"');
  });

  it("sem refrão → nenhuma classe chorus", () => {
    expect(toHtml("[C]So verso\n[G]sem refrao")).not.toContain("chorus");
  });
});

describe("hasChorus", () => {
  it("detecta refrão marcado", () => {
    expect(hasChorus("[C]v\n{start_of_chorus}\n[G]r\n{end_of_chorus}")).toBe(true);
  });
  it("sem marcação → false", () => {
    expect(hasChorus("[C]so verso")).toBe(false);
  });
});

describe("round-trip do editor — marcar refrão sobrevive", () => {
  it("acordes sobre a letra + {soc}/{eoc} → toChordPro → toHtml ainda marca o refrão", () => {
    const raw = "C\nVerso\n\n{start_of_chorus}\nG      C\nRefrão\n{end_of_chorus}\n\nVerso dois";
    expect(toHtml(toChordPro(raw))).toContain('class="paragraph chorus"');
  });
});
