import { describe, expect, it } from "vitest";
import type { RepertoireType, TagCategory } from "./index";

// Teste-sanidade: garante que o pipeline de testes (Vitest) roda no monorepo.
// Lógica de domínio real (tags efetivas, perícope) entra via TDD na Fase 1.
describe("@asafe/core vocabulário", () => {
  it("aceita um tipo de repertório litúrgico", () => {
    const type: RepertoireType = "Missa";
    expect(type).toBe("Missa");
  });

  it("aceita uma categoria de tag", () => {
    const category: TagCategory = "momento";
    expect(category).toBe("momento");
  });
});
