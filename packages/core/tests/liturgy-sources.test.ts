import { describe, expect, it } from "vitest";
import {
  firstSundayOfAdvent,
  liturgicalYearOf,
  ferialCycleOf,
  mapLitcalEvents,
  parseDancrfReadings,
  parseDancrfFull,
} from "../src/liturgy";

describe("datas litúrgicas", () => {
  it("1º Domingo do Advento = domingo mais próximo de 30/nov", () => {
    // 2024: 30/nov é sábado → Advento começa 01/dez/2024
    expect(firstSundayOfAdvent(2024).toISOString().slice(0, 10)).toBe("2024-12-01");
    // 2025: 30/nov é domingo → é o próprio dia
    expect(firstSundayOfAdvent(2025).toISOString().slice(0, 10)).toBe("2025-11-30");
  });

  it("ano litúrgico vira no Advento", () => {
    expect(liturgicalYearOf("2025-07-20")).toBe(2025); // antes do Advento
    expect(liturgicalYearOf("2025-12-07")).toBe(2026); // depois do Advento 2025
  });

  it("ciclo ferial: ímpar=I, par=II (contado pelo ano litúrgico)", () => {
    expect(ferialCycleOf("2025-07-20")).toBe("I"); // ano litúrgico 2025
    expect(ferialCycleOf("2025-12-07")).toBe("II"); // ano litúrgico 2026
  });
});

// Fixtures reais (capturados da LitCal Geral Romano 2025).
const SUNDAY_16 = [
  {
    event_key: "OrdSunday16",
    name: "Dominica XVI «Per Annum»",
    color: ["green"],
    grade: 5,
    liturgical_season: "ORDINARY_TIME",
    day_of_the_week_iso8601: 7,
    liturgical_year: "ANNUM C",
    date: "2025-07-20T00:00:00+00:00",
  },
];
const MONDAY_16 = [
  {
    event_key: "OrdWeekday16Monday",
    name: "Feria II Hebdomadæ Decimæ sextæ Temporis per annum",
    color: ["green"],
    grade: 0,
    liturgical_season: "ORDINARY_TIME",
    day_of_the_week_iso8601: 1,
    liturgical_year: "ANNUM C",
    date: "2025-07-21T00:00:00+00:00",
  },
  {
    event_key: "StLawrenceBrindisi",
    name: "Sancti Laurentii de Brindisi",
    color: ["white"],
    grade: 2,
    liturgical_season: "ORDINARY_TIME",
    day_of_the_week_iso8601: 1,
    liturgical_year: "ANNUM C",
    date: "2025-07-21T00:00:00+00:00",
  },
];

describe("mapLitcalEvents", () => {
  it("domingo do tempo comum → eventKey OrdSunday16, ciclo A/B/C", () => {
    const r = mapLitcalEvents(SUNDAY_16, "2025-07-20");
    expect(r.season).toBe("ordinary");
    expect(r.dayOfWeek).toBe(0);
    expect(r.eventKey).toBe("OrdSunday16");
    expect(r.sundayCycle).toBe("C");
    expect(r.color).toBe("green");
    expect(r.fixedReadings).toBeFalsy();
  });

  it("feria com memória opcional → chave da feria (leituras feriais), não do santo", () => {
    const r = mapLitcalEvents(MONDAY_16, "2025-07-21");
    expect(r.eventKey).toBe("OrdWeekday16Monday"); // não StLawrenceBrindisi
    expect(r.dayOfWeek).toBe(1);
    expect(r.ferialCycle).toBe("I");
    expect(r.fixedReadings).toBeFalsy();
  });

  it("lança se não houver evento para a data", () => {
    expect(() => mapLitcalEvents(SUNDAY_16, "2025-07-21")).toThrow();
  });
});

describe("parseDancrfReadings", () => {
  it("extrai as referências (objeto por tipo) + nome pt, ignora o texto", () => {
    const raw = {
      liturgia: "16º Domingo do Tempo Comum",
      cor: "Verde",
      leituras: {
        primeiraLeitura: [{ referencia: "Gn 18,1-10", titulo: "…", texto: "corpo pesado" }],
        salmo: [{ referencia: "Sl 14", texto: "…" }],
        segundaLeitura: [{ referencia: "Cl 1,24-28", texto: "…" }],
        evangelho: [{ referencia: "Lc 10,38-42", texto: "…" }],
      },
    };
    const out = parseDancrfReadings(raw);
    expect(out.celebration).toBe("16º Domingo do Tempo Comum");
    expect(out.refs).toEqual([
      { kind: "primeira", ref: "Gn 18,1-10" },
      { kind: "salmo", ref: "Sl 14" },
      { kind: "segunda", ref: "Cl 1,24-28" },
      { kind: "evangelho", ref: "Lc 10,38-42" },
    ]);
  });

  it("dia sem 2ª leitura (feria) → sem essa referência", () => {
    const raw = {
      liturgia: "Feria",
      leituras: {
        primeiraLeitura: [{ referencia: "Ex 14,21-31" }],
        salmo: [{ referencia: "Ex 15" }],
        segundaLeitura: [],
        evangelho: [{ referencia: "Mt 12,46-50" }],
      },
    };
    const out = parseDancrfReadings(raw);
    expect(out.refs.map((r) => r.kind)).toEqual(["primeira", "salmo", "evangelho"]);
  });
});

describe("parseDancrfFull (leitura ao vivo — texto não persistido)", () => {
  it("inclui título e texto além da referência, na ordem canônica", () => {
    const raw = {
      leituras: {
        primeiraLeitura: [{ referencia: "Gn 18,1-10", titulo: "Leitura do Gênesis", texto: "Naqueles dias…" }],
        salmo: [{ referencia: "Sl 14", titulo: "Salmo", texto: "Senhor, quem…" }],
        segundaLeitura: [{ referencia: "Cl 1,24-28", titulo: "Leitura de Colossenses", texto: "Irmãos…" }],
        evangelho: [{ referencia: "Lc 10,38-42", titulo: "Evangelho", texto: "Naquele tempo…" }],
      },
    };
    const out = parseDancrfFull(raw);
    expect(out.map((r) => r.kind)).toEqual(["primeira", "salmo", "segunda", "evangelho"]);
    expect(out[0]).toEqual({
      kind: "primeira",
      ref: "Gn 18,1-10",
      title: "Leitura do Gênesis",
      text: "Naqueles dias…",
    });
  });

  it("salmo: captura o refrão (resposta da assembleia)", () => {
    const raw = {
      leituras: {
        salmo: [
          {
            referencia: "Sl 14(15)",
            refrao: "Senhor, quem morará em vossa casa?",
            texto: "— É aquele que caminha sem pecado…",
          },
        ],
      },
    };
    const [salmo] = parseDancrfFull(raw);
    expect(salmo?.kind).toBe("salmo");
    expect(salmo?.refrain).toBe("Senhor, quem morará em vossa casa?");
    expect(salmo?.text).toBe("— É aquele que caminha sem pecado…");
  });

  it("leitura comum não tem refrão", () => {
    const raw = {
      leituras: { primeiraLeitura: [{ referencia: "Gn 18", titulo: "Gênesis", texto: "…" }] },
    };
    expect(parseDancrfFull(raw)[0]?.refrain).toBeUndefined();
  });

  it("pula leitura sem texto (ex.: feria sem 2ª)", () => {
    const raw = {
      leituras: {
        primeiraLeitura: [{ referencia: "Ex 14", titulo: "1ª", texto: "…" }],
        salmo: [{ referencia: "Ex 15", titulo: "Salmo", texto: "…" }],
        segundaLeitura: [],
        evangelho: [{ referencia: "Mt 12", titulo: "Ev", texto: "…" }],
      },
    };
    expect(parseDancrfFull(raw).map((r) => r.kind)).toEqual(["primeira", "salmo", "evangelho"]);
  });
});
