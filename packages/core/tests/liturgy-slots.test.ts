import { describe, expect, it } from "vitest";
import { applyLiturgy, type LiturgicalSnapshot, type SlotDef } from "../src";

const MISSA_SLOTS: SlotDef[] = [
  { key: "entrada", label: "Entrada", optional: false },
  { key: "gloria", label: "Glória", optional: true },
  { key: "salmo", label: "Salmo Responsorial", optional: false },
  { key: "aclamacao", label: "Aclamação ao Evangelho", optional: false },
  { key: "comunhao", label: "Comunhão", optional: false },
  { key: "final", label: "Final", optional: false },
];

function snap(partial: Partial<LiturgicalSnapshot>): LiturgicalSnapshot {
  return {
    key: "OrdSunday16",
    cycle: "C",
    date: "2025-07-20",
    celebration: "16º Domingo do Tempo Comum",
    season: "ordinary",
    color: "green",
    readings: [
      { kind: "primeira", ref: "Gn 18,1-10" },
      { kind: "salmo", ref: "Sl 14(15)" },
      { kind: "segunda", ref: "Cl 1,24-28" },
      { kind: "evangelho", ref: "Lc 10,38-42" },
    ],
    ...partial,
  };
}

const keys = (slots: SlotDef[]) => slots.map((s) => s.key);

describe("applyLiturgy", () => {
  it("sem snapshot: slots inalterados, liturgy null", () => {
    const out = applyLiturgy(MISSA_SLOTS, null);
    expect(out.slots).toEqual(MISSA_SLOTS);
    expect(out.liturgy).toBeNull();
  });

  it("Tempo Comum: mantém Glória; salmo do dia vira hint; contexto preenchido", () => {
    const out = applyLiturgy(MISSA_SLOTS, snap({ season: "ordinary" }));
    expect(keys(out.slots)).toContain("gloria");
    const salmo = out.slots.find((s) => s.key === "salmo");
    expect(salmo?.hint).toBe("Sl 14(15)");
    expect(out.liturgy?.seasonLabel).toBe("Tempo Comum");
    expect(out.liturgy?.celebration).toBe("16º Domingo do Tempo Comum");
    expect(out.liturgy?.readings).toHaveLength(4);
  });

  it("Advento: Glória omitido", () => {
    const out = applyLiturgy(MISSA_SLOTS, snap({ season: "advent", celebration: "2º Domingo do Advento" }));
    expect(keys(out.slots)).not.toContain("gloria");
    expect(out.liturgy?.seasonLabel).toBe("Advento");
  });

  it("Quaresma: Glória omitido e Aclamação sem Aleluia", () => {
    const out = applyLiturgy(MISSA_SLOTS, snap({ season: "lent", celebration: "3º Domingo da Quaresma" }));
    expect(keys(out.slots)).not.toContain("gloria");
    const acl = out.slots.find((s) => s.key === "aclamacao");
    expect(acl?.label).toMatch(/sem Aleluia/i);
    expect(out.liturgy?.seasonLabel).toBe("Quaresma");
  });

  it("não muta os slots de entrada", () => {
    const before = JSON.parse(JSON.stringify(MISSA_SLOTS));
    applyLiturgy(MISSA_SLOTS, snap({ season: "lent" }));
    expect(MISSA_SLOTS).toEqual(before);
  });
});
