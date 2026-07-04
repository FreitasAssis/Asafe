import { describe, expect, it } from "vitest";
import { referenceExplanation } from "../src/copyright";

describe("referenceExplanation", () => {
  it("protegida/desconhecida → explica direitos autorais e contrasta com o que se vê", () => {
    for (const s of ["protegida", "desconhecida"] as const) {
      const msg = referenceExplanation(s);
      expect(msg).toMatch(/direitos autorais/i);
      // deve deixar claro por que OUTRAS aparecem cheias
      expect(msg).toMatch(/dom[íi]nio p[úu]blico|licen[çc]a aberta|suas/i);
    }
  });

  it("livre/domínio público → mensagem neutra, sem falar de proteção", () => {
    for (const s of ["dominio_publico", "licenca_aberta", "permissao"] as const) {
      const msg = referenceExplanation(s);
      expect(msg).not.toMatch(/direitos autorais/i);
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});
