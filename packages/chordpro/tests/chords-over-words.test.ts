import { describe, expect, it } from "vitest";
import { chordsOverWordsToChordPro } from "../src/chords-over-words";

describe("chordsOverWordsToChordPro", () => {
  it("alinha os acordes à coluna da letra", () => {
    expect(chordsOverWordsToChordPro("C       G\nAmazing grace")).toBe(
      "[C]Amazing [G]grace",
    );
  });

  it("preserva a notação exata do acorde alterado (meio-diminuto, aumentado)", () => {
    // O ChordsOverWordsParser do ChordSheetJS descartava F°7 e G7+; aqui não.
    const out = chordsOverWordsToChordPro("F°7  G7+\nSou trigo");
    expect(out).toContain("[F°7]");
    expect(out).toContain("[G7+]");
  });

  it("preserva C#m7b5 e F#m7+ (bemol/sustenido no sufixo)", () => {
    const out = chordsOverWordsToChordPro("C#m7b5   F#m7+\nSanto, Santo");
    expect(out).toContain("[C#m7b5]");
    expect(out).toContain("[F#m7+]");
  });

  it("quando o acorde cai além do fim da letra, completa com espaços", () => {
    expect(chordsOverWordsToChordPro("Am        F\nEu")).toBe(
      "[Am]Eu        [F]",
    );
  });

  it("linha de acordes sem letra abaixo vira acordes sobre espaços", () => {
    const out = chordsOverWordsToChordPro("C   G\n\nletra");
    expect(out).toContain("[C]");
    expect(out).toContain("[G]");
    expect(out).toContain("letra");
  });

  it("mantém intactas as linhas que não são de acordes", () => {
    const out = chordsOverWordsToChordPro("Refrão:\nC\nCantai");
    expect(out).toContain("Refrão:");
    expect(out).toContain("[C]Cantai");
  });
});
