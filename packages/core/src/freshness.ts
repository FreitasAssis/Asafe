/**
 * Indicador de frescor (DESIGN/fatia D2, §2): "usada há tanto tempo", para evitar
 * repetir música de uma celebração para outra. Função pura.
 */

export type FreshnessLevel = "fresca" | "recente" | "ok";

export interface Freshness {
  label: string;
  /** fresca = nunca/há muito; recente = usar com cautela (cantou faz pouco); ok = neutro. */
  level: FreshnessLevel;
}

const DAY = 86_400_000;

/**
 * Rótulo de frescor a partir da última data de uso (ou `null` se nunca usada),
 * relativo a `today`. Data futura (repertório agendado) conta como "esta semana".
 */
export function freshnessLabel(lastUsed: Date | null, today: Date): Freshness {
  if (lastUsed === null) return { label: "nunca usada", level: "fresca" };

  const days = Math.floor((today.getTime() - lastUsed.getTime()) / DAY);

  if (days <= 7) return { label: "esta semana", level: "recente" };

  if (days < 60) {
    const weeks = Math.round(days / 7);
    return {
      label: `há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`,
      level: days <= 14 ? "recente" : "ok",
    };
  }

  const months = Math.round(days / 30);
  return { label: `há ${months} ${months === 1 ? "mês" : "meses"}`, level: "ok" };
}
