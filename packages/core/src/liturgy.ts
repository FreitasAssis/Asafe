/**
 * Camada litúrgica — lógica pura (DESIGN.md §6). Não faz rede: recebe uma
 * resolução já normalizada (vinda da LitCal, no servidor) e deriva a chave
 * litúrgica / o ciclo do lecionário, além de sobrepor os próprios do Brasil.
 *
 * A `liturgical_key` é INDEPENDENTE do ano (a Páscoa é móvel, mas a posição
 * litúrgica não): é ela que casa repertórios da mesma celebração entre anos e
 * indexa o dicionário `lectionary`.
 */

export * from "./liturgy-sources";

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
  /** Id canônico e estável da posição na LitCal (ex.: "OrdSunday16"). */
  eventKey?: string;
}

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * Chave litúrgica canônica (sem o ciclo — o ciclo é a 2ª parte da PK do
 * `lectionary`). Ex.: `ordinary-16-sun`, `lent-3-tue`, ou a `properKey`
 * (`aparecida`) quando a celebração própria tem leituras próprias.
 */
export function deriveLiturgicalKey(res: LiturgyResolution): string {
  if (res.properKey) return res.properKey;
  if (res.eventKey) return res.eventKey;
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

// ── Resolução + cache (orquestração pura; IO é injetado) ─────────────────────

export type ReadingKind = "primeira" | "salmo" | "segunda" | "evangelho" | "sequencia";

/** Referência de uma leitura (só a referência — o texto tem copyright, ver §6). */
export interface ReadingRef {
  kind: ReadingKind;
  ref: string;
}

export interface DailyReadings {
  refs: ReadingRef[];
  /** Nome litúrgico em pt vindo da fonte de leituras (a LitCal é em latim). */
  celebration?: string;
}

/** Resolve a identidade litúrgica de uma data (Geral Romano). Implementado no app (LitCal). */
export interface LitcalClient {
  resolve(date: string): Promise<LiturgyResolution>;
}

/** Busca as leituras de uma data (por DATA — as APIs BR não indexam por referência). */
export interface LiturgyProvider {
  getReadings(date: string): Promise<DailyReadings>;
  /** Santo/celebração do dia (opcional; nem toda fonte cobre). */
  getSaint?(date: string): Promise<string | null>;
}

/** Cache durável em Postgres (duas camadas). Implementado no app (service role). */
export interface LiturgyCache {
  getDay(date: string, nation: string): Promise<LiturgyResolution | null>;
  putDay(date: string, nation: string, res: LiturgyResolution): Promise<void>;
  getLectionary(key: string, cycle: string): Promise<DailyReadings | null>;
  putLectionary(key: string, cycle: string, readings: DailyReadings): Promise<void>;
}

export interface ResolvedLiturgy {
  resolution: LiturgyResolution;
  key: string;
  cycle: string;
  readings: DailyReadings;
}

export interface ResolveDeps {
  litcal: LitcalClient;
  provider: LiturgyProvider;
  cache: LiturgyCache;
  /** Calendário nacional (default "BR"). */
  nation?: string;
}

/**
 * Resolve o dia litúrgico com cache em duas camadas (DESIGN.md §6):
 *  1. `liturgical_day` por (data, nação) — miss chama a LitCal, aplica o próprio
 *     do Brasil e grava.
 *  2. `lectionary` por (chave, ciclo) — miss chama o provider (por data),
 *     guarda só as referências e grava.
 * Hit em ambas as camadas = zero chamada externa.
 */
export async function resolveDailyLiturgy(
  date: string,
  { litcal, provider, cache, nation = "BR" }: ResolveDeps,
): Promise<ResolvedLiturgy> {
  let resolution = await cache.getDay(date, nation);
  if (!resolution) {
    resolution = applyBrazilianPropers(await litcal.resolve(date));
    await cache.putDay(date, nation, resolution);
  }

  const key = deriveLiturgicalKey(resolution);
  const cycle = lectionaryCycle(resolution);

  let readings = await cache.getLectionary(key, cycle);
  if (!readings) {
    readings = await provider.getReadings(date);
    await cache.putLectionary(key, cycle, readings);
  }

  return { resolution, key, cycle, readings };
}

/**
 * Cópia CONGELADA gravada em `repertoire.liturgical_snapshot` na criação
 * (identidade + rótulos + referências; sem texto integral). É registro
 * imutável, não cache regenerável (§6).
 */
export interface LiturgicalSnapshot {
  key: string;
  cycle: string;
  date: string;
  celebration: string;
  season: LiturgicalSeason;
  color: LiturgicalColor;
  readings: ReadingRef[];
}

export function buildSnapshot(r: ResolvedLiturgy): LiturgicalSnapshot {
  return {
    key: r.key,
    cycle: r.cycle,
    date: r.resolution.date,
    // prefere o nome em pt da fonte de leituras; a resolução da LitCal é em latim.
    celebration: r.readings.celebration ?? r.resolution.celebration,
    season: r.resolution.season,
    color: r.resolution.color,
    readings: r.readings.refs,
  };
}
