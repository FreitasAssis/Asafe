/**
 * Motor de sugestão por momento (A5, v1) — ranqueamento PURO. Recebe as músicas
 * candidatas com os sinais já apurados (o servidor faz as consultas) e devolve as
 * melhores para o momento, com o motivo de cada uma.
 *
 * Ordem (o conteúdo da leitura lidera, ver DESIGN §6):
 *   1. ligada à leitura do dia (A4, por sobreposição de versículos)
 *   2. encaixe no momento (tag Comunhão…)
 *   3. encaixe no tempo litúrgico (tag do tempo)
 *   4. frescor entra como REBAIXAMENTO da recém-cantada (não some) / bônus da fresca.
 *
 * Só entra quem tem ao menos um sinal positivo (leitura/momento/tempo) — frescor
 * sozinho não faz de uma música uma "sugestão para este momento".
 */

import { freshnessLabel } from "./freshness";

export type SuggestionReason = "leitura" | "momento" | "tempo" | "usada" | "fresca";

export interface SuggestionCandidate {
  id: string;
  /** Ligada a alguma leitura do dia (A4). */
  linkedToReading: boolean;
  /** Tem a tag do momento atual (ex.: Comunhão). */
  momentMatch: boolean;
  /** Tem a tag do tempo litúrgico do dia. */
  seasonMatch: boolean;
  /** Vezes usada NAQUELE momento nos repertórios que vejo (hábito → comunidade). */
  momentUsage?: number;
  /** Dessas, quantas na MESMA celebração (liturgical_key). */
  anchorUsage?: number;
  /** Última vez cantada (data efetiva), ou null se nunca. */
  lastUsed: Date | null;
}

export interface RankedSuggestion {
  id: string;
  score: number;
  reasons: SuggestionReason[];
}

const W_READING = 100;
const W_MOMENT = 20;
const W_SEASON = 10;
const W_USAGE = 8; // reforço por uso no momento (log → um hit não domina)
const W_ANCHOR = 6; // reforço extra quando é a mesma celebração
const BONUS_FRESH = 5; // nunca/há muito
const PENALTY_RECENT = 15; // cantou faz pouco

/** Reforço bounded (log2) para o número de usos — cresce devagar e não lidera. */
const usageBoost = (weight: number, count: number) =>
  count > 0 ? weight * Math.log2(1 + count) : 0;

/** Ranqueia as candidatas para um momento; devolve as melhores com o motivo. */
export function rankMomentSuggestions(
  candidates: SuggestionCandidate[],
  today: Date,
  limit = 6,
): RankedSuggestion[] {
  const ranked: RankedSuggestion[] = [];

  for (const cand of candidates) {
    const reasons: SuggestionReason[] = [];
    let score = 0;

    if (cand.linkedToReading) {
      score += W_READING;
      reasons.push("leitura");
    }
    if (cand.momentMatch) {
      score += W_MOMENT;
      reasons.push("momento");
    }
    if (cand.seasonMatch) {
      score += W_SEASON;
      reasons.push("tempo");
    }
    const momentUsage = cand.momentUsage ?? 0;
    if (momentUsage > 0) {
      // Hábito é um sinal de adequação por si só ("você costuma pôr esta aqui").
      score += usageBoost(W_USAGE, momentUsage);
      score += usageBoost(W_ANCHOR, cand.anchorUsage ?? 0);
      reasons.push("usada");
    }

    // Sem sinal de adequação → não é sugestão (frescor sozinho não conta).
    if (reasons.length === 0) continue;

    const level = freshnessLabel(cand.lastUsed, today).level;
    if (level === "fresca") {
      score += BONUS_FRESH;
      reasons.push("fresca");
    } else if (level === "recente") {
      score -= PENALTY_RECENT;
    }

    ranked.push({ id: cand.id, score, reasons });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
