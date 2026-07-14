import { ChordProParser } from "chordsheetjs";

/**
 * Garante que os blocos `{start_of_chorus}`/`{end_of_chorus}` fiquem em **parágrafo próprio**
 * (linha em branco antes e depois). O parser do ChordSheetJS só marca o tipo `chorus` quando
 * o bloco está isolado — então normalizamos, cobrindo o caso de o usuário ter digitado os
 * marcadores colados a outras linhas. Base do "Ao vivo pula pro refrão" (DESIGN §7).
 */
export function ensureChorusBlocks(chordpro: string): string {
  const isSoc = (l: string) => /^\s*\{\s*(start_of_chorus|soc)\b/i.test(l);
  const isEoc = (l: string) => /^\s*\{\s*(end_of_chorus|eoc)\b/i.test(l);
  const lines = chordpro.split("\n");
  const out: string[] = [];
  lines.forEach((l, i) => {
    if (isSoc(l) && out.at(-1)?.trim()) out.push("");
    out.push(l);
    if (isEoc(l) && i + 1 < lines.length && lines[i + 1]!.trim() !== "") out.push("");
  });
  return out.join("\n");
}

/** A cifra tem um **refrão** marcado? Decide se o "Ao vivo" mostra o botão de pular pro refrão. */
export function hasChorus(chordpro: string): boolean {
  return new ChordProParser()
    .parse(ensureChorusBlocks(chordpro))
    .paragraphs.some((p) => p.type === "chorus");
}
