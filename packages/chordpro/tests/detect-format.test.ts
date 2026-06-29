import { describe, expect, it } from "vitest";
import { detectFormat } from "../src/detect-format";

describe("detectFormat", () => {
  it("reconhece ChordPro pela presença de acordes entre colchetes", () => {
    expect(detectFormat("[C]Amazing [F]grace, how [G]sweet")).toBe("chordpro");
  });

  it("reconhece ChordPro mesmo com diretivas e só um acorde", () => {
    expect(detectFormat("{title: Vem, Espírito}\nVem, ó [G]Espírito")).toBe(
      "chordpro",
    );
  });

  it("reconhece acordes sobre a letra", () => {
    const input = ["C        G", "Amazing  grace", "F      C", "how sweet"].join(
      "\n",
    );
    expect(detectFormat(input)).toBe("chords-over-lyrics");
  });

  it("reconhece uma única linha de acordes acima da letra", () => {
    expect(detectFormat("Am      F\nEu navegarei")).toBe("chords-over-lyrics");
  });

  it("trata texto sem acordes como só letra", () => {
    expect(detectFormat("Amazing grace, how sweet the sound")).toBe(
      "lyrics-only",
    );
  });

  it("trata texto vazio ou em branco como só letra", () => {
    expect(detectFormat("")).toBe("lyrics-only");
    expect(detectFormat("   \n  \n")).toBe("lyrics-only");
  });

  it("não confunde letra comum com linha de acordes", () => {
    // "A" e "E" isolados são acordes válidos, mas a frase toda não é uma linha de acordes.
    expect(detectFormat("A casa caiu\nE todos correram")).toBe("lyrics-only");
  });
});
