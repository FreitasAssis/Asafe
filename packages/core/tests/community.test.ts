import { describe, expect, it } from "vitest";
import {
  COMMUNITY_STATUS_LABELS,
  COMMUNITY_STATUS_TONE,
  latestEventPerTarget,
  type CommunityStatus,
  type ModerationEventLite,
} from "../src/community";

describe("latestEventPerTarget", () => {
  it("mantém, por alvo, o evento mais recente (por createdAt)", () => {
    const events: ModerationEventLite[] = [
      { targetId: "a", decision: "return", reason: "qualidade_cifra", note: "1", createdAt: "2026-01-01T00:00:00Z" },
      { targetId: "a", decision: "reject", reason: "duplicada", note: "2", createdAt: "2026-02-01T00:00:00Z" },
      { targetId: "b", decision: "approve", reason: null, note: null, createdAt: "2026-01-15T00:00:00Z" },
    ];
    const m = latestEventPerTarget(events);
    expect(m.get("a")?.decision).toBe("reject"); // fev > jan
    expect(m.get("a")?.note).toBe("2");
    expect(m.get("b")?.decision).toBe("approve");
    expect(m.size).toBe(2);
  });

  it("ordem de entrada não importa — vence sempre o createdAt maior", () => {
    const events: ModerationEventLite[] = [
      { targetId: "x", decision: "reject", reason: null, note: "novo", createdAt: "2026-05-01T00:00:00Z" },
      { targetId: "x", decision: "return", reason: null, note: "velho", createdAt: "2026-03-01T00:00:00Z" },
    ];
    expect(latestEventPerTarget(events).get("x")?.note).toBe("novo");
  });

  it("lista vazia → mapa vazio", () => {
    expect(latestEventPerTarget([]).size).toBe(0);
  });
});

describe("rótulos de status da comunidade", () => {
  const all: CommunityStatus[] = ["none", "pending", "approved", "rejected", "returned"];
  it("todo status tem rótulo e tom", () => {
    for (const s of all) {
      expect(COMMUNITY_STATUS_LABELS[s]).toBeTruthy();
      expect(COMMUNITY_STATUS_TONE[s]).toBeTruthy();
    }
  });
});
