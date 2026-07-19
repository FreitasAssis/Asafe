/**
 * Ajuste dos slots da Missa pelo tempo litúrgico (A3, DESIGN.md §6). Função pura:
 * recebe os slots do template + o snapshot congelado e devolve os slots já
 * condicionados (Glória omitido no Advento/Quaresma; Aclamação sem "Aleluia" na
 * Quaresma; salmo próprio do dia como dica) + o contexto litúrgico para exibir.
 */

import type { SlotDef } from "./arrange-repertoire";
import type { LiturgicalColor, LiturgicalSeason, LiturgicalSnapshot, ReadingRef } from "./liturgy";

export interface LiturgyContext {
  date: string;
  celebration: string;
  season: LiturgicalSeason;
  seasonLabel: string;
  color: LiturgicalColor;
  colorLabel: string;
  readings: ReadingRef[];
}

const SEASON_LABELS: Record<LiturgicalSeason, string> = {
  advent: "Advento",
  christmas: "Tempo do Natal",
  lent: "Quaresma",
  easter: "Tempo Pascal",
  ordinary: "Tempo Comum",
  triduum: "Tríduo Pascal",
};

const COLOR_LABELS: Record<LiturgicalColor, string> = {
  green: "Verde",
  purple: "Roxo",
  white: "Branco",
  red: "Vermelho",
  rose: "Rosa",
};

/** Estações em que o Glória é omitido (fora de solenidades/festas). */
const NO_GLORIA: ReadonlySet<LiturgicalSeason> = new Set(["advent", "lent"]);

export interface AppliedLiturgy {
  slots: SlotDef[];
  liturgy: LiturgyContext | null;
}

export function applyLiturgy(
  slots: SlotDef[],
  snapshot: LiturgicalSnapshot | null,
): AppliedLiturgy {
  if (!snapshot) return { slots, liturgy: null };

  const psalmRef = snapshot.readings.find((r) => r.kind === "salmo")?.ref;

  const adjusted = slots
    .filter((slot) => !(slot.key === "gloria" && NO_GLORIA.has(snapshot.season)))
    .map((slot) => {
      if (slot.key === "salmo" && psalmRef) return { ...slot, hint: psalmRef };
      if (slot.key === "aclamacao" && snapshot.season === "lent") {
        return { ...slot, label: `${slot.label} (sem Aleluia)` };
      }
      return slot;
    });

  const liturgy: LiturgyContext = {
    date: snapshot.date,
    celebration: snapshot.celebration,
    season: snapshot.season,
    seasonLabel: SEASON_LABELS[snapshot.season],
    color: snapshot.color,
    colorLabel: COLOR_LABELS[snapshot.color],
    readings: snapshot.readings,
  };

  return { slots: adjusted, liturgy };
}
