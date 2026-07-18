import { describe, it, expect } from "vitest";
import { lyricParagraphs } from "../src/lyric-paragraphs";

describe("lyricParagraphs", () => {
  it("agrupa a letra por parágrafo (estrofe), sem acordes — um slide por estrofe", () => {
    const cp = "[C]Primeira linha\nsegunda linha\n\n[G]Terceira linha\nquarta linha";
    expect(lyricParagraphs(cp)).toEqual([
      ["Primeira linha", "segunda linha"],
      ["Terceira linha", "quarta linha"],
    ]);
  });

  it("isola o refrão marcado num parágrafo próprio (um slide para o refrão inteiro)", () => {
    const cp = "[C]Verso um\n{start_of_chorus}\nHosana a\nHosana b\n{end_of_chorus}\n[G]Verso dois";
    expect(lyricParagraphs(cp)).toEqual([["Verso um"], ["Hosana a", "Hosana b"], ["Verso dois"]]);
  });

  it("ignora parágrafos sem letra (ex.: trecho só instrumental)", () => {
    const cp = "[C] [G] [Am]\n\n[C]Com letra aqui";
    expect(lyricParagraphs(cp)).toEqual([["Com letra aqui"]]);
  });
});
