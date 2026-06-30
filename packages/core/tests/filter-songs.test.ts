import { describe, expect, it } from "vitest";
import { filterSongs } from "../src/filter-songs";

const songs = [
  { id: "a", tagIds: ["comunhao", "casamento"] }, // comunhão + casamento
  { id: "b", tagIds: ["comunhao"] }, // comunhão
  { id: "c", tagIds: ["ofertorio", "casamento"] }, // ofertório + casamento
  { id: "d", tagIds: [] }, // sem tags
];

const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

describe("filterSongs", () => {
  it("sem seleção devolve tudo", () => {
    expect(ids(filterSongs(songs, []))).toEqual(["a", "b", "c", "d"]);
  });

  it("um grupo: filtra por uma tag (Comunhão)", () => {
    expect(ids(filterSongs(songs, [["comunhao"]]))).toEqual(["a", "b"]);
  });

  it("dois grupos = E entre categorias (Comunhão E Casamento)", () => {
    expect(ids(filterSongs(songs, [["comunhao"], ["casamento"]]))).toEqual(["a"]);
  });

  it("um grupo com 2 tags = OU dentro da categoria (Comunhão OU Ofertório)", () => {
    expect(ids(filterSongs(songs, [["comunhao", "ofertorio"]]))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ignora grupos vazios", () => {
    expect(ids(filterSongs(songs, [[], ["casamento"]]))).toEqual(["a", "c"]);
  });
});
