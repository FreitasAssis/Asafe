import { describe, expect, it } from "vitest";
import { attributionWarning, suggestAttribution } from "../src/copyright";

describe("suggestAttribution", () => {
  it("compositor nomeado (contemporâneo) → provavelmente protegida (autor_nomeado)", () => {
    expect(suggestAttribution("Pe. Fábio de Melo")).toBe("autor_nomeado");
    expect(suggestAttribution("João da Silva")).toBe("autor_nomeado");
  });

  it("marcadores tradicionais → domínio público", () => {
    expect(suggestAttribution("Tradicional")).toBe("dominio_publico");
    expect(suggestAttribution("Canto Gregoriano")).toBe("dominio_publico");
    expect(suggestAttribution("Anônimo")).toBe("dominio_publico");
  });

  it("sem compositor → sem sugestão", () => {
    expect(suggestAttribution("")).toBeNull();
    expect(suggestAttribution(null)).toBeNull();
  });
});

describe("attributionWarning", () => {
  it("marcou domínio público mas nomeou um autor → avisa", () => {
    expect(attributionWarning("dominio_publico", "Pe. Fábio de Melo")).toBeTruthy();
  });

  it("marcou de minha autoria mas é um compositor conhecido → avisa", () => {
    expect(attributionWarning("propria", "Pe. Fábio de Melo")).toBeTruthy();
  });

  it("escolha coerente → sem aviso", () => {
    expect(attributionWarning("autor_nomeado", "Pe. Fábio de Melo")).toBeNull();
    expect(attributionWarning("dominio_publico", "Tradicional")).toBeNull();
    expect(attributionWarning("desconhecida", "Qualquer")).toBeNull();
  });

  it("sem compositor → sem aviso (nada a inferir)", () => {
    expect(attributionWarning("dominio_publico", "")).toBeNull();
    expect(attributionWarning("propria", null)).toBeNull();
  });
});
