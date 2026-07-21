import { describe, expect, it } from "vitest";
import { parseReadingRef, refsOverlap, segmentsOverlap } from "../src";

/** Segmento compacto p/ asserção legível: "LC 15:11-32". */
const fmt = (s: { book: string; chapter: number; verseStart: number; verseEnd: number }) =>
  `${s.book} ${s.chapter}:${s.verseStart}-${s.verseEnd}`;
const parse = (ref: string) => parseReadingRef(ref).map(fmt);

describe("parseReadingRef — formatos reais da liturgia", () => {
  it("faixa simples", () => {
    expect(parse("Lc 15,11-32")).toEqual(["LC 15:11-32"]);
    expect(parse("Cl 3,1-4")).toEqual(["CL 3:1-4"]);
  });

  it("livro numerado, com ou sem espaço", () => {
    expect(parse("1Cor 5,6-8")).toEqual(["1COR 5:6-8"]);
    expect(parse("1Jo 3, 1-3")).toEqual(["1JO 3:1-3"]);
    expect(parse("1Rs 19,9")).toEqual(["1RS 19:9-9"]);
  });

  it("sufixo de letra no versículo é ignorado (6b, 12a)", () => {
    expect(parse("1Cor 5,6b-8")).toEqual(["1COR 5:6-8"]);
    expect(parse("Mt 5, 1-12a")).toEqual(["MT 5:1-12"]);
  });

  it("vários trechos separados por ponto (com ou sem espaço)", () => {
    expect(parse("1Rs 19,9.11-13")).toEqual(["1RS 19:9-9", "1RS 19:11-13"]);
    expect(parse("Ap 7, 2-4. 9-14")).toEqual(["AP 7:2-4", "AP 7:9-14"]);
    expect(parse("At 10,34.37-43")).toEqual(["AT 10:34-34", "AT 10:37-43"]);
  });

  it("faixa que atravessa capítulo vira dois segmentos", () => {
    // Mt 9,36 até Mt 10,8 = resto do cap. 9 + início do cap. 10
    expect(parse("Mt 9,36-10,8")).toEqual(["MT 9:36-999", "MT 10:1-8"]);
  });

  it("salmo sem versículos = capítulo inteiro; numeração alternativa gera os dois", () => {
    expect(parse("Sl 101(102)")).toEqual(["SL 101:1-999", "SL 102:1-999"]);
    expect(parse("Sl 84")).toEqual(["SL 84:1-999"]);
  });

  it("acentos e pontuação do livro são normalizados", () => {
    expect(parse("Gn 18,1-10")).toEqual(["GN 18:1-10"]);
    expect(parse("1 Cor 10,1-6")).toEqual(["1COR 10:1-6"]);
  });

  it("ponto e vírgula separa GRUPOS DE CAPÍTULO (formato real da fonte)", () => {
    // 04/07/2025: Gn 23,1-4.19; 24,1-8.62-67
    expect(parse("Gn 23,1-4.19; 24,1-8.62-67")).toEqual([
      "GN 23:1-4",
      "GN 23:19-19",
      "GN 24:1-8",
      "GN 24:62-67",
    ]);
  });

  it("referência vazia/ininteligível → sem segmentos (degrada, não quebra)", () => {
    expect(parse("")).toEqual([]);
    expect(parse("???")).toEqual([]);
  });
});

describe("sobreposição — o resgate do A4", () => {
  it("CRITÉRIO: vínculo num recorte reaparece num recorte sobreposto diferente", () => {
    // Lc 15 "curto" (só a parábola) × "longo" (com a introdução) — mesma parábola
    expect(refsOverlap("Lc 15,11-32", "Lc 15,1-3.11-32")).toBe(true);
  });

  it("recortes disjuntos no mesmo capítulo NÃO casam", () => {
    expect(refsOverlap("Lc 15,11-32", "Lc 15,1-3")).toBe(false);
  });

  it("livro ou capítulo diferente não casa", () => {
    expect(refsOverlap("Lc 15,11-32", "Mt 15,11-32")).toBe(false);
    expect(refsOverlap("Lc 15,11-32", "Lc 16,11-32")).toBe(false);
  });

  it("sobreposição na borda casa", () => {
    expect(refsOverlap("Jo 8,21-30", "Jo 8,30-40")).toBe(true);
  });

  it("PRECISÃO com dado real: mesmo capítulo, recortes disjuntos NÃO casam", () => {
    // 30/06/2025 (Gn 18,16-33) × 20/07/2025 (Gn 18,1-10) — mesmo capítulo, trechos diferentes
    expect(refsOverlap("Gn 18,16-33", "Gn 18,1-10")).toBe(false);
    // mas um recorte que os cruza casa com os dois
    expect(refsOverlap("Gn 18,1-33", "Gn 18,16-33")).toBe(true);
  });

  it("salmo: numeração alternativa casa (101(102) × 102)", () => {
    expect(refsOverlap("Sl 101(102)", "Sl 102")).toBe(true);
  });

  it("faixa que atravessa capítulo casa com o capítulo seguinte", () => {
    expect(refsOverlap("Mt 9,36-10,8", "Mt 10,1-4")).toBe(true);
  });

  it("ref ininteligível não casa com nada (sem falso positivo)", () => {
    expect(refsOverlap("???", "Lc 15,11-32")).toBe(false);
  });

  it("segmentsOverlap opera sobre segmentos já decompostos", () => {
    const a = parseReadingRef("Lc 15,11-32");
    expect(segmentsOverlap(a, parseReadingRef("Lc 15,25-32"))).toBe(true);
    expect(segmentsOverlap(a, parseReadingRef("Lc 15,1-2"))).toBe(false);
  });
});
