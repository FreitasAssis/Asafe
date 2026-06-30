import { describe, expect, it } from "vitest";
import { arrangeRepertoire, type SlotDef } from "../src/arrange-repertoire";

const slots: SlotDef[] = [
  { key: "entrada", label: "Entrada", optional: false },
  { key: "gloria", label: "Glória", optional: true },
  { key: "comunhao", label: "Comunhão", optional: false },
];

describe("arrangeRepertoire", () => {
  it("agrupa itens por momento, na ordem do template e da ordem do item", () => {
    const items = [
      { id: "x", momentSlot: "comunhao", order: 1 },
      { id: "y", momentSlot: "comunhao", order: 0 },
      { id: "z", momentSlot: "entrada", order: 0 },
    ];
    const out = arrangeRepertoire(slots, items);
    expect(out.slots.map((s) => s.key)).toEqual(["entrada", "gloria", "comunhao"]);
    expect(out.slots[0]!.items.map((i) => i.id)).toEqual(["z"]);
    expect(out.slots[1]!.items).toEqual([]); // Glória vazio, mas o momento aparece
    expect(out.slots[2]!.items.map((i) => i.id)).toEqual(["y", "x"]); // ordenado por order
    expect(out.unslotted).toEqual([]);
  });

  it("itens sem slot (Sarau) ou com slot fora do template caem em unslotted, ordenados", () => {
    const items = [
      { id: "a", momentSlot: null, order: 1 },
      { id: "b", momentSlot: null, order: 0 },
      { id: "c", momentSlot: "inexistente", order: 0 },
    ];
    const out = arrangeRepertoire([], items);
    expect(out.slots).toEqual([]);
    // ordenado por order: b(0), c(0), a(1) — estável para empates
    expect(out.unslotted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("preserva os rótulos e o 'optional' do slot", () => {
    const out = arrangeRepertoire(slots, []);
    expect(out.slots[1]).toMatchObject({ key: "gloria", label: "Glória", optional: true });
  });
});
