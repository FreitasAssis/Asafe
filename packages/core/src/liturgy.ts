/**
 * Camada litúrgica — lógica pura (DESIGN.md §6). Não faz rede: recebe uma
 * resolução já normalizada (vinda da LitCal, no servidor) e deriva a chave
 * litúrgica / o ciclo do lecionário, além de sobrepor os próprios do Brasil.
 *
 * A `liturgical_key` é INDEPENDENTE do ano (a Páscoa é móvel, mas a posição
 * litúrgica não): é ela que casa repertórios da mesma celebração entre anos e
 * indexa o dicionário `lectionary`.
 */

export type LiturgicalSeason =
  | "advent"
  | "christmas"
  | "lent"
  | "easter"
  | "ordinary"
  | "triduum";

export type LiturgicalColor = "green" | "purple" | "white" | "red" | "rose";

export type LiturgicalRank =
  | "ferial"
  | "optional_memorial"
  | "memorial"
  | "feast"
  | "solemnity";

export type SundayCycle = "A" | "B" | "C";
export type FerialCycle = "I" | "II";

/** Resolução normalizada de um dia litúrgico (o que a LitCal + override BR produzem). */
export interface LiturgyResolution {
  /** "YYYY-MM-DD" (data civil, fuso America/Sao_Paulo). */
  date: string;
  season: LiturgicalSeason;
  /** Semana dentro do tempo (ex.: 16 no "16º Domingo do Tempo Comum"). */
  week: number;
  /** 0=domingo … 6=sábado. */
  dayOfWeek: number;
  rank: LiturgicalRank;
  celebration: string;
  color: LiturgicalColor;
  /** Ciclo dominical A/B/C do ano litúrgico. */
  sundayCycle: SundayCycle;
  /** Ciclo ferial I/II (anos ímpares = I, pares = II). */
  ferialCycle: FerialCycle;
  /** Celebração própria com leituras próprias (ex.: "aparecida"). */
  properKey?: string;
  /** Leituras próprias que independem do ciclo A/B/C ou I/II. */
  fixedReadings?: boolean;
}

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * Chave litúrgica canônica (sem o ciclo — o ciclo é a 2ª parte da PK do
 * `lectionary`). Ex.: `ordinary-16-sun`, `lent-3-tue`, ou a `properKey`
 * (`aparecida`) quando a celebração própria tem leituras próprias.
 */
export function deriveLiturgicalKey(res: LiturgyResolution): string {
  if (res.properKey) return res.properKey;
  return `${res.season}-${res.week}-${DOW[res.dayOfWeek]}`;
}

/**
 * Ciclo usado para casar o lecionário: A/B/C nos domingos; I/II nas ferias;
 * `-` quando a celebração tem leituras próprias/fixas (independem do ciclo).
 */
export function lectionaryCycle(res: LiturgyResolution): SundayCycle | FerialCycle | "-" {
  if (res.properKey && res.fixedReadings) return "-";
  return res.dayOfWeek === 0 ? res.sundayCycle : res.ferialCycle;
}

/** Celebração própria do Brasil (data fixa). Curadoria completa é item à parte (A0). */
export interface BrazilianProper {
  month: number;
  day: number;
  key: string;
  celebration: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  fixedReadings: boolean;
}

/**
 * Próprios do Brasil que a LitCal (só Geral Romano) não traz. Lista mínima e
 * extensível — a curadoria completa contra o Missal da CNBB fica separada.
 */
export const BRAZILIAN_PROPERS: readonly BrazilianProper[] = [
  {
    month: 10,
    day: 12,
    key: "aparecida",
    celebration: "Nossa Senhora Aparecida",
    rank: "solemnity",
    color: "white",
    fixedReadings: true,
  },
  {
    month: 6,
    day: 9,
    key: "anchieta",
    celebration: "São José de Anchieta",
    rank: "memorial",
    color: "white",
    fixedReadings: false,
  },
  {
    month: 11,
    day: 11,
    key: "frei-galvao",
    celebration: "São Frei Galvão",
    rank: "memorial",
    color: "white",
    fixedReadings: false,
  },
];

const RANK_ORDER: Record<LiturgicalRank, number> = {
  ferial: 0,
  optional_memorial: 1,
  memorial: 2,
  feast: 3,
  solemnity: 4,
};

/**
 * Sobrepõe o próprio do Brasil sobre a resolução do Geral Romano quando ele
 * precede o dia-base. Precedência pragmática: uma solenidade sempre vence; uma
 * memória/festa não vence um domingo nem um tempo forte (Advento/Quaresma/
 * Páscoa/Tríduo). Regras finas de precedência ficam para curadoria futura.
 */
export function applyBrazilianPropers(base: LiturgyResolution): LiturgyResolution {
  const [, month, day] = base.date.split("-").map(Number);
  const proper = BRAZILIAN_PROPERS.find((p) => p.month === month && p.day === day);
  if (!proper) return base;
  if (RANK_ORDER[proper.rank] <= RANK_ORDER[base.rank]) return base;

  const basePrivileged =
    base.dayOfWeek === 0 || ["advent", "lent", "easter", "triduum"].includes(base.season);
  if (proper.rank !== "solemnity" && basePrivileged) return base;

  return {
    ...base,
    celebration: proper.celebration,
    rank: proper.rank,
    color: proper.color,
    properKey: proper.key,
    fixedReadings: proper.fixedReadings,
  };
}
