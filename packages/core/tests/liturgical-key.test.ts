import { describe, expect, it } from "vitest";
import {
  deriveLiturgicalKey,
  lectionaryCycle,
  applyBrazilianPropers,
  type LiturgyResolution,
} from "../src/liturgy";

/** Resolução-base (Geral Romano) com defaults sensatos; sobrescreve o que o caso precisa. */
function res(partial: Partial<LiturgyResolution>): LiturgyResolution {
  return {
    date: "2026-07-19",
    season: "ordinary",
    week: 16,
    dayOfWeek: 0,
    rank: "ferial",
    celebration: "16º Domingo do Tempo Comum",
    color: "green",
    sundayCycle: "C",
    ferialCycle: "II",
    ...partial,
  };
}

describe("deriveLiturgicalKey", () => {
  it("domingo do tempo comum → season-week-sun", () => {
    expect(deriveLiturgicalKey(res({ dayOfWeek: 0, season: "ordinary", week: 16 }))).toBe(
      "ordinary-16-sun",
    );
  });

  it("feria (dia de semana) → season-week-<dow>", () => {
    expect(deriveLiturgicalKey(res({ dayOfWeek: 2, season: "lent", week: 3 }))).toBe("lent-3-tue");
  });

  it("celebração própria usa a properKey (independe de data)", () => {
    expect(
      deriveLiturgicalKey(res({ properKey: "aparecida", fixedReadings: true })),
    ).toBe("aparecida");
  });
});

describe("lectionaryCycle", () => {
  it("domingo usa o ciclo A/B/C", () => {
    expect(lectionaryCycle(res({ dayOfWeek: 0, sundayCycle: "C" }))).toBe("C");
  });

  it("feria usa o ciclo I/II", () => {
    expect(lectionaryCycle(res({ dayOfWeek: 3, ferialCycle: "I" }))).toBe("I");
  });

  it("leituras próprias/fixas → '-' (não dependem do ciclo)", () => {
    expect(
      lectionaryCycle(res({ properKey: "aparecida", fixedReadings: true, dayOfWeek: 1 })),
    ).toBe("-");
  });
});

describe("applyBrazilianPropers", () => {
  it("Aparecida (solenidade) vence a feria de 12/out", () => {
    const out = applyBrazilianPropers(
      res({ date: "2026-10-12", dayOfWeek: 1, season: "ordinary", rank: "ferial" }),
    );
    expect(out.properKey).toBe("aparecida");
    expect(out.rank).toBe("solemnity");
    expect(out.color).toBe("white");
    expect(out.fixedReadings).toBe(true);
  });

  it("Aparecida vence mesmo caindo num domingo (solenidade precede)", () => {
    const out = applyBrazilianPropers(res({ date: "2026-10-12", dayOfWeek: 0, season: "ordinary" }));
    expect(out.properKey).toBe("aparecida");
  });

  it("memória própria aplica num dia comum", () => {
    const out = applyBrazilianPropers(
      res({ date: "2026-06-09", dayOfWeek: 2, season: "ordinary", rank: "ferial" }),
    );
    expect(out.properKey).toBe("anchieta");
    expect(out.rank).toBe("memorial");
  });

  it("memória própria NÃO vence um domingo", () => {
    const out = applyBrazilianPropers(
      res({ date: "2026-06-09", dayOfWeek: 0, season: "ordinary", rank: "ferial" }),
    );
    expect(out.properKey).toBeUndefined();
    expect(out.celebration).toBe("16º Domingo do Tempo Comum");
  });

  it("data sem próprio do Brasil fica inalterada", () => {
    const base = res({ date: "2026-07-19" });
    expect(applyBrazilianPropers(base)).toEqual(base);
  });
});
