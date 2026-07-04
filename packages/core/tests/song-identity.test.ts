import { describe, expect, it } from "vitest";
import { songIdentityKey } from "../src/song-identity";

describe("songIdentityKey", () => {
  it("mesma música com caixa/acento/espaço diferentes → mesma chave", () => {
    expect(songIdentityKey("Vem, Espírito Santo", "Pe. João")).toBe(
      songIdentityKey("vem, espirito  santo", "pe. joao"),
    );
  });

  it("compositor diferente → chave diferente (mesma letra, autor distinto)", () => {
    expect(songIdentityKey("Cordeiro de Deus", "Autor A")).not.toBe(
      songIdentityKey("Cordeiro de Deus", "Autor B"),
    );
  });

  it("compositor nulo e vazio são equivalentes", () => {
    expect(songIdentityKey("Aleluia", null)).toBe(songIdentityKey("Aleluia", ""));
  });

  it("títulos diferentes → chaves diferentes", () => {
    expect(songIdentityKey("Entrada", null)).not.toBe(songIdentityKey("Ofertório", null));
  });
});
