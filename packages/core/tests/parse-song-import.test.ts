import { describe, expect, it } from "vitest";
import { parseSongImport } from "../src/parse-song-import";

const tags = [
  { id: "t-entrada", name: "Entrada" },
  { id: "t-aclamacao", name: "Aclamação" },
  { id: "t-advento", name: "Advento" },
];

describe("parseSongImport", () => {
  it("separa por '---' e extrai rótulo→tag, título e cifra", () => {
    const text = ["ENTRADA", "Vem, Senhor Jesus", "[C]Vem, [G]Senhor", "---", "ACLAMAÇÃO", "Aleluia", "Ale[D]luia"].join("\n");
    const r = parseSongImport(text, tags);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ title: "Vem, Senhor Jesus", tagIds: ["t-entrada"] });
    expect(r[0]!.body).toBe("[C]Vem, [G]Senhor");
    expect(r[0]!.warnings).toEqual([]);
    expect(r[1]).toMatchObject({ title: "Aleluia", tagIds: ["t-aclamacao"] });
    expect(r[1]!.body).toBe("Ale[D]luia");
  });

  it("vários rótulos no topo viram várias tags", () => {
    const text = ["Entrada", "Advento", "Vem, Emanuel", "[Am]Vem"].join("\n");
    const [song] = parseSongImport(text, tags);
    expect(song!.title).toBe("Vem, Emanuel");
    expect([...song!.tagIds].sort()).toEqual(["t-advento", "t-entrada"]);
    expect(song!.body).toBe("[Am]Vem");
  });

  it("sem rótulo: a 1ª linha é o título e não há tags", () => {
    const [song] = parseSongImport("Canto Qualquer\n[C]letra", tags);
    expect(song).toMatchObject({ title: "Canto Qualquer", tagIds: [] });
    expect(song!.body).toBe("[C]letra");
  });

  it("casa sem acento/maiúsculas e parcial (tag contida na linha)", () => {
    const text = ["ACLAMACAO ao Evangelho", "Aleluia", "[D]Aleluia"].join("\n");
    const [song] = parseSongImport(text, tags);
    expect(song!.tagIds).toEqual(["t-aclamacao"]);
    expect(song!.title).toBe("Aleluia");
  });

  it("bloco sem cifra recebe aviso", () => {
    const [song] = parseSongImport("Entrada\nSó o Título", tags);
    expect(song).toMatchObject({ title: "Só o Título", body: "", tagIds: ["t-entrada"] });
    expect(song!.warnings).toContain("sem cifra");
  });

  it("ignora separadores e blocos vazios (sem músicas fantasma)", () => {
    const text = ["---", "", "Título\n[C]x", "---", "   ", "---"].join("\n");
    const r = parseSongImport(text, tags);
    expect(r).toHaveLength(1);
    expect(r[0]!.title).toBe("Título");
  });

  it("texto vazio → lista vazia", () => {
    expect(parseSongImport("   \n  ", tags)).toEqual([]);
  });
});
