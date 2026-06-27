import { describe, expect, it } from "vitest";
import { effectiveTags, type TagOverride } from "../src/effective-tags";

const sorted = (s: Set<string>) => [...s].sort();

describe("effectiveTags", () => {
  it("sem overrides, devolve as tags globais", () => {
    expect(sorted(effectiveTags(["ENTRADA", "ADVENTO"], []))).toEqual([
      "ADVENTO",
      "ENTRADA",
    ]);
  });

  it("aplica add e remove sobre as tags globais (§5)", () => {
    const overrides: TagOverride[] = [
      { tagId: "ENTRADA", action: "remove" },
      { tagId: "FINAL", action: "add" },
    ];
    expect(sorted(effectiveTags(["ENTRADA", "ADVENTO"], overrides))).toEqual([
      "ADVENTO",
      "FINAL",
    ]);
  });

  it("add de tag já presente não duplica", () => {
    expect(sorted(effectiveTags(["A"], [{ tagId: "A", action: "add" }]))).toEqual([
      "A",
    ]);
  });

  it("remove de tag ausente é no-op", () => {
    expect(sorted(effectiveTags(["A"], [{ tagId: "Z", action: "remove" }]))).toEqual([
      "A",
    ]);
  });

  it("aplica overrides na ordem (add depois remove da mesma tag => ausente)", () => {
    const overrides: TagOverride[] = [
      { tagId: "X", action: "add" },
      { tagId: "X", action: "remove" },
    ];
    expect(sorted(effectiveTags([], overrides))).toEqual([]);
  });

  it("não muta a entrada", () => {
    const input = ["A"];
    effectiveTags(input, [{ tagId: "B", action: "add" }]);
    expect(input).toEqual(["A"]);
  });
});
