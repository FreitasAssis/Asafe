import { describe, expect, it } from "vitest";
import { freshnessLabel } from "../src/freshness";

const hoje = new Date("2026-06-30T12:00:00Z");
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86400000);

describe("freshnessLabel", () => {
  it("nunca usada quando não há data", () => {
    expect(freshnessLabel(null, hoje)).toEqual({ label: "nunca usada", level: "fresca" });
  });

  it("esta semana (≤ 7 dias)", () => {
    expect(freshnessLabel(diasAtras(3), hoje)).toEqual({
      label: "esta semana",
      level: "recente",
    });
  });

  it("há N semanas (recente até ~2 semanas, depois ok)", () => {
    expect(freshnessLabel(diasAtras(10), hoje)).toEqual({
      label: "há 1 semana",
      level: "recente",
    });
    expect(freshnessLabel(diasAtras(21), hoje)).toEqual({
      label: "há 3 semanas",
      level: "ok",
    });
  });

  it("há N meses para uso antigo", () => {
    expect(freshnessLabel(diasAtras(70), hoje)).toEqual({
      label: "há 2 meses",
      level: "ok",
    });
  });

  it("data futura (repertório agendado) conta como recente", () => {
    expect(freshnessLabel(diasAtras(-3), hoje)).toEqual({
      label: "esta semana",
      level: "recente",
    });
  });
});
