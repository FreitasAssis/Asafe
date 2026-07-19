"use server";

import type { ReadingWithText } from "@asafe/core";
import { dancrfReadingTexts } from "./provider";

/**
 * Busca o TEXTO das leituras do dia ao vivo, para exibição (com crédito à CNBB).
 * O texto NÃO é persistido (ver A0/§6). Falha → lista vazia (o caller mostra aviso).
 */
export async function getDayReadingTexts(date: string): Promise<ReadingWithText[]> {
  try {
    return await dancrfReadingTexts(date);
  } catch (e) {
    console.error(`[liturgia] leitura ao vivo falhou para ${date}:`, e);
    return [];
  }
}
