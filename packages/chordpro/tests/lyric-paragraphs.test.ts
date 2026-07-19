import { describe, it, expect } from "vitest";
import { lyricParagraphs } from "../src/lyric-paragraphs";

describe("lyricParagraphs", () => {
  it("agrupa a letra por parágrafo (estrofe), sem acordes — um slide por estrofe", () => {
    const cp = "[C]Primeira linha\nsegunda linha\n\n[G]Terceira linha\nquarta linha";
    expect(lyricParagraphs(cp)).toEqual([
      { chorus: false, lines: ["Primeira linha", "segunda linha"] },
      { chorus: false, lines: ["Terceira linha", "quarta linha"] },
    ]);
  });

  it("marca o refrão (parágrafo próprio) para o botão Refrão da Projeção", () => {
    const cp = "[C]Verso um\n{start_of_chorus}\nHosana a\nHosana b\n{end_of_chorus}\n[G]Verso dois";
    expect(lyricParagraphs(cp)).toEqual([
      { chorus: false, lines: ["Verso um"] },
      { chorus: true, lines: ["Hosana a", "Hosana b"] },
      { chorus: false, lines: ["Verso dois"] },
    ]);
  });

  it("ignora parágrafos sem letra (ex.: trecho só instrumental)", () => {
    const cp = "[C] [G] [Am]\n\n[C]Com letra aqui";
    expect(lyricParagraphs(cp)).toEqual([{ chorus: false, lines: ["Com letra aqui"] }]);
  });
});
