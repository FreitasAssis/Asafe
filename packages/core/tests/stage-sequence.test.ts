import { describe, expect, it } from "vitest";
import { buildStageSequence, type LiturgicalSnapshot, type SlotDef } from "../src";

const SLOTS: SlotDef[] = [
  { key: "entrada", label: "Entrada", optional: false },
  { key: "salmo", label: "Salmo Responsorial", optional: false },
  { key: "aclamacao", label: "Aclamação ao Evangelho", optional: false },
  { key: "comunhao", label: "Comunhão", optional: false },
];

interface Item {
  id: string;
  momentSlot: string | null;
  order: number;
}
const song = (id: string, slot: string | null, order = 0): Item => ({ id, momentSlot: slot, order });

function snap(kinds: LiturgicalSnapshot["readings"]): LiturgicalSnapshot {
  return {
    key: "OrdSunday16",
    cycle: "C",
    date: "2025-07-20",
    celebration: "16º Domingo",
    season: "ordinary",
    color: "green",
    readings: kinds,
  };
}

/** Rótulo compacto de cada passo p/ asserção legível. */
const label = (s: ReturnType<typeof buildStageSequence<Item>>[number]) =>
  s.kind === "song" ? `song:${s.item.id}` : `read:${s.reading.kind}`;

describe("buildStageSequence", () => {
  it("sem snapshot: só músicas, na ordem dos slots (nenhuma leitura)", () => {
    const steps = buildStageSequence(
      SLOTS,
      [song("a", "entrada"), song("b", "comunhao")],
      null,
    );
    expect(steps.map(label)).toEqual(["song:a", "song:b"]);
  });

  it("Missa com 4 leituras: 1ª antes do Salmo, 2ª depois, Evangelho após a Aclamação", () => {
    const steps = buildStageSequence(
      SLOTS,
      [song("ent", "entrada"), song("sal", "salmo"), song("acl", "aclamacao"), song("com", "comunhao")],
      snap([
        { kind: "primeira", ref: "Gn 18,1-10" },
        { kind: "salmo", ref: "Sl 14" },
        { kind: "segunda", ref: "Cl 1,24-28" },
        { kind: "evangelho", ref: "Lc 10,38-42" },
      ]),
    );
    expect(steps.map(label)).toEqual([
      "song:ent",
      "read:primeira",
      "song:sal",
      "read:segunda",
      "song:acl",
      "read:evangelho",
      "song:com",
    ]);
  });

  it("sem música no Salmo: mostra o salmo do dia como passo, logo após a 1ª leitura", () => {
    const steps = buildStageSequence(
      SLOTS,
      // Repertório sem música no slot 'salmo' (só entrada, aclamação, comunhão).
      [song("ent", "entrada"), song("acl", "aclamacao"), song("com", "comunhao")],
      snap([
        { kind: "primeira", ref: "Gn 18,1-10" },
        { kind: "salmo", ref: "Sl 14" },
        { kind: "segunda", ref: "Cl 1,24-28" },
        { kind: "evangelho", ref: "Lc 10,38-42" },
      ]),
    );
    expect(steps.map(label)).toEqual([
      "song:ent",
      "read:primeira",
      "read:salmo",
      "read:segunda",
      "song:acl",
      "read:evangelho",
      "song:com",
    ]);
  });

  it("com música no Salmo: NÃO insere o salmo do dia (a música ocupa o momento)", () => {
    const steps = buildStageSequence(
      SLOTS,
      [song("sal", "salmo")],
      snap([
        { kind: "primeira", ref: "Gn 18" },
        { kind: "salmo", ref: "Sl 14" },
        { kind: "evangelho", ref: "Lc 10" },
      ]),
    );
    expect(steps.map(label)).toEqual(["read:primeira", "song:sal", "read:evangelho"]);
  });

  it("feria sem 2ª leitura: não insere o passo da 2ª", () => {
    const steps = buildStageSequence(
      SLOTS,
      [song("sal", "salmo"), song("acl", "aclamacao")],
      snap([
        { kind: "primeira", ref: "Ex 14" },
        { kind: "salmo", ref: "Ex 15" },
        { kind: "evangelho", ref: "Mt 12" },
      ]),
    );
    expect(steps.map(label)).toEqual([
      "read:primeira",
      "song:sal",
      "song:acl",
      "read:evangelho",
    ]);
  });

  it("posições ancoram nos slots mesmo vazios (sem música no Salmo/Aclamação)", () => {
    const steps = buildStageSequence(
      SLOTS,
      [song("ent", "entrada")],
      snap([
        { kind: "primeira", ref: "Gn 18" },
        { kind: "segunda", ref: "Cl 1" },
        { kind: "evangelho", ref: "Lc 10" },
      ]),
    );
    expect(steps.map(label)).toEqual([
      "song:ent",
      "read:primeira",
      "read:segunda",
      "read:evangelho",
    ]);
  });
});
