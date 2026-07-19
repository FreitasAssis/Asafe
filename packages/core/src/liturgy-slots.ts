/**
 * Ajuste dos slots da Missa pelo tempo litúrgico (A3, DESIGN.md §6). Função pura:
 * recebe os slots do template + o snapshot congelado e devolve os slots já
 * condicionados (Glória omitido no Advento/Quaresma; Aclamação sem "Aleluia" na
 * Quaresma; salmo próprio do dia como dica) + o contexto litúrgico para exibir.
 */

import { arrangeRepertoire, type ArrangeableItem, type SlotDef } from "./arrange-repertoire";
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

/** Hex de cada cor litúrgica — fonte única para a bolinha/realce em toda a UI. */
export const LITURGICAL_COLOR_HEX: Record<LiturgicalColor, string> = {
  green: "#2a7d4f",
  purple: "#6b3fa0",
  white: "#c9c4b8",
  red: "#b33",
  rose: "#d98cae",
};

/** Hex a partir de uma cor possivelmente crua/ausente (ex.: vinda do banco); null se inválida. */
export function liturgicalColorHex(color: string | null | undefined): string | null {
  return color && color in LITURGICAL_COLOR_HEX
    ? LITURGICAL_COLOR_HEX[color as LiturgicalColor]
    : null;
}

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

/** Um passo da apresentação (Ao vivo / Projeção): uma música OU uma leitura. */
export type StageStep<T> =
  | { kind: "song"; item: T }
  | { kind: "reading"; reading: ReadingRef };

/**
 * Sequência linear dos modos de palco (#102) com as LEITURAS intercaladas na
 * ordem litúrgica: **1ª leitura** antes do Salmo, **2ª leitura** depois do
 * Salmo, **Evangelho** logo após a Aclamação. (Salmo e Aclamação seguem sendo
 * os slots de música.)
 *
 * A estrutura é DETERMINÍSTICA a partir do snapshot — não depende de o texto ter
 * sido carregado —, então mestre e seguidores têm a MESMA lista de passos e o
 * `idx` do sync não desalinha. O texto entra depois, por leitura.
 */
export function buildStageSequence<T extends ArrangeableItem>(
  slots: SlotDef[],
  items: T[],
  snapshot: LiturgicalSnapshot | null,
): StageStep<T>[] {
  const arranged = arrangeRepertoire(slots, items);
  const readingByKind = new Map((snapshot?.readings ?? []).map((r) => [r.kind, r]));
  const readingStep = (kind: ReadingRef["kind"]): StageStep<T>[] => {
    const reading = readingByKind.get(kind);
    return reading ? [{ kind: "reading", reading }] : [];
  };

  const steps: StageStep<T>[] = [];
  for (const slot of arranged.slots) {
    if (slot.key === "salmo") steps.push(...readingStep("primeira"));
    for (const item of slot.items) steps.push({ kind: "song", item });
    if (slot.key === "salmo") steps.push(...readingStep("segunda"));
    if (slot.key === "aclamacao") steps.push(...readingStep("evangelho"));
  }
  for (const item of arranged.unslotted) steps.push({ kind: "song", item });
  return steps;
}
