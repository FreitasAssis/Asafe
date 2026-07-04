import { describe, expect, it } from "vitest";
import { authorizedStatus, COPYRIGHT_STATUS_LABELS } from "../src/copyright";

describe("authorizedStatus (permissão por obra — C11)", () => {
  it("autorização declarada + evidência → permissao", () => {
    expect(authorizedStatus(true, "https://autor.com/permissao")).toBe("permissao");
    expect(authorizedStatus(true, "  autorizou por e-mail  ")).toBe("permissao");
  });

  it("sem evidência → protegida (mesmo declarando autorização)", () => {
    expect(authorizedStatus(true, "")).toBe("protegida");
    expect(authorizedStatus(true, "   ")).toBe("protegida");
  });

  it("sem autorização → protegida", () => {
    expect(authorizedStatus(false, "https://autor.com/permissao")).toBe("protegida");
  });
});

describe("COPYRIGHT_STATUS_LABELS", () => {
  it("todo status tem rótulo legível", () => {
    for (const s of ["dominio_publico", "licenca_aberta", "permissao", "protegida", "desconhecida"] as const) {
      expect(COPYRIGHT_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
