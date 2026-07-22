import { describe, expect, it } from "vitest";
import { rankMomentSuggestions, type SuggestionCandidate } from "../src";

const hoje = new Date("2026-07-20T12:00:00Z");
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86400000);

/** Candidata com defaults "sem sinal"; sobrescreve o que o caso precisa. */
function c(id: string, p: Partial<SuggestionCandidate> = {}): SuggestionCandidate {
  return { id, linkedToReading: false, momentMatch: false, seasonMatch: false, lastUsed: null, ...p };
}
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe("rankMomentSuggestions", () => {
  it("conteúdo da leitura lidera; depois momento; depois tempo", () => {
    const out = rankMomentSuggestions(
      [c("tempo", { seasonMatch: true }), c("leitura", { linkedToReading: true }), c("momento", { momentMatch: true })],
      hoje,
    );
    expect(ids(out)).toEqual(["leitura", "momento", "tempo"]);
  });

  it("exclui quem não tem nenhum sinal positivo (frescor sozinho não é sugestão)", () => {
    const out = rankMomentSuggestions([c("nada", { lastUsed: null }), c("boa", { momentMatch: true })], hoje);
    expect(ids(out)).toEqual(["boa"]);
  });

  it("frescor REBAIXA a recém-cantada, mas não a remove", () => {
    const out = rankMomentSuggestions(
      [c("recente", { momentMatch: true, lastUsed: diasAtras(3) }), c("antiga", { momentMatch: true, lastUsed: diasAtras(200) })],
      hoje,
    );
    expect(ids(out)).toEqual(["antiga", "recente"]); // mesma tag, a fresca sobe
    expect(out.map((r) => r.id)).toContain("recente"); // mas continua na lista
  });

  it("um sinal forte vence o rebaixamento de frescor", () => {
    // ligada à leitura (recém-cantada) ainda passa na frente de uma só-do-tempo fresca
    const out = rankMomentSuggestions(
      [c("leitura", { linkedToReading: true, lastUsed: diasAtras(2) }), c("tempo", { seasonMatch: true, lastUsed: null })],
      hoje,
    );
    expect(ids(out)[0]).toBe("leitura");
  });

  it("registra os motivos de cada sugestão ('fresca' = nunca usada)", () => {
    const [row] = rankMomentSuggestions(
      [c("x", { linkedToReading: true, momentMatch: true, lastUsed: null })],
      hoje,
    );
    expect(row!.reasons).toEqual(expect.arrayContaining(["leitura", "momento", "fresca"]));
  });

  it("respeita o limite", () => {
    const many = Array.from({ length: 10 }, (_, i) => c(`s${i}`, { momentMatch: true }));
    expect(rankMomentSuggestions(many, hoje, 6)).toHaveLength(6);
  });

  it("lista vazia → sem sugestões", () => {
    expect(rankMomentSuggestions([], hoje)).toEqual([]);
  });

  it("uso: entre iguais, a mais usada NAQUELE momento sobe (com selo 'usada')", () => {
    const out = rankMomentSuggestions(
      [c("pouco", { momentMatch: true, momentUsage: 0 }), c("muito", { momentMatch: true, momentUsage: 5 })],
      hoje,
    );
    expect(ids(out)).toEqual(["muito", "pouco"]);
    expect(out.find((r) => r.id === "muito")!.reasons).toContain("usada");
  });

  it("uso é hábito e SOZINHO já qualifica como sugestão", () => {
    const out = rankMomentSuggestions([c("habito", { momentUsage: 3 })], hoje);
    expect(ids(out)).toEqual(["habito"]);
    expect(out[0]!.reasons).toContain("usada");
  });

  it("uso é REFORÇO, não líder: não vence o conteúdo da leitura", () => {
    const out = rankMomentSuggestions(
      [c("muito-usada", { momentMatch: true, momentUsage: 100 }), c("leitura", { linkedToReading: true })],
      hoje,
    );
    expect(ids(out)[0]).toBe("leitura");
  });

  it("bônus quando casa a MESMA celebração (anchorUsage)", () => {
    const out = rankMomentSuggestions(
      [c("geral", { momentMatch: true, momentUsage: 4 }), c("mesma", { momentMatch: true, momentUsage: 4, anchorUsage: 4 })],
      hoje,
    );
    expect(ids(out)).toEqual(["mesma", "geral"]);
  });
});
