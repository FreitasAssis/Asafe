import { describe, expect, it } from "vitest";
import {
  CLOSED_TAG_CATEGORIES,
  OPEN_TAG_CATEGORIES,
  TAG_CATEGORY_COLORS,
  TAG_CATEGORY_LABELS,
} from "../src/tag-categories";
import type { TagCategory } from "../src/types";

const ALL: TagCategory[] = [
  "momento",
  "tempo_liturgico",
  "tema",
  "ocasiao",
  "fonte",
  "salmo",
];

describe("metadados de categoria de tag", () => {
  it("toda categoria tem rótulo e cor", () => {
    for (const c of ALL) {
      expect(TAG_CATEGORY_LABELS[c]).toBeTruthy();
      expect(TAG_CATEGORY_COLORS[c]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("aberta + fechada cobrem todas as categorias, sem sobreposição", () => {
    const union = [...OPEN_TAG_CATEGORIES, ...CLOSED_TAG_CATEGORIES].sort();
    expect(union).toEqual([...ALL].sort());
  });
});
