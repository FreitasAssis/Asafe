/**
 * Adaptadores PUROS das fontes externas → tipos do domínio (DESIGN.md §6, A2).
 * Ficam aqui (e não no app) porque são lógica pura testável com fixtures; os
 * clients do app só fazem o fetch e chamam estas funções.
 */

import type {
  DailyReadings,
  FerialCycle,
  LiturgicalColor,
  LiturgicalRank,
  LiturgicalSeason,
  LiturgyResolution,
  ReadingRef,
  SundayCycle,
} from "./liturgy";
import { applyBrazilianPropers } from "./liturgy";

// ── Datas litúrgicas ─────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** 1º Domingo do Advento = domingo mais próximo de 30 de novembro (Santo André). */
export function firstSundayOfAdvent(year: number): Date {
  const andrew = new Date(Date.UTC(year, 10, 30)); // 30/nov
  const dow = andrew.getUTCDay(); // 0=domingo
  const offset = dow <= 3 ? -dow : 7 - dow; // domingo mais próximo
  return new Date(andrew.getTime() + offset * DAY_MS);
}

/** Ano litúrgico a que a data civil pertence (vira no 1º Domingo do Advento). */
export function liturgicalYearOf(date: string): number {
  const y = Number(date.slice(0, 4));
  const d = new Date(`${date}T00:00:00Z`);
  return d >= firstSundayOfAdvent(y) ? y + 1 : y;
}

/** Ciclo ferial I/II: ano litúrgico ímpar = I, par = II. */
export function ferialCycleOf(date: string): FerialCycle {
  return liturgicalYearOf(date) % 2 === 1 ? "I" : "II";
}

// ── LitCal (Geral Romano) ────────────────────────────────────────────────────

/** Subconjunto dos campos da LitCal que usamos. */
export interface LitcalRawEvent {
  event_key: string;
  name: string;
  color: string[];
  grade: number;
  liturgical_season: string;
  day_of_the_week_iso8601: number;
  liturgical_year?: string;
  date: string;
}

const SEASONS: Record<string, LiturgicalSeason> = {
  ADVENT: "advent",
  CHRISTMAS: "christmas",
  LENT: "lent",
  EASTER: "easter",
  EASTER_TRIDUUM: "triduum",
  ORDINARY_TIME: "ordinary",
};

const COLORS: Record<string, LiturgicalColor> = {
  green: "green",
  purple: "purple",
  violet: "purple",
  white: "white",
  red: "red",
  rose: "rose",
  pink: "rose",
};

function mapGrade(grade: number): LiturgicalRank {
  if (grade >= 6) return "solemnity";
  if (grade >= 4) return "feast";
  if (grade === 3) return "memorial";
  if (grade >= 1) return "optional_memorial";
  return "ferial";
}

function parseWeek(eventKey: string): number {
  const m = /(\d+)/.exec(eventKey);
  return m ? Number(m[1]) : 0;
}

function parseSundayCycle(litYear: string | undefined): SundayCycle {
  const m = /([ABC])\s*$/.exec(litYear ?? "");
  return (m?.[1] as SundayCycle) ?? "A";
}

/**
 * Mapeia os eventos da LitCal de uma data → resolução do domínio, e já aplica os
 * próprios do Brasil. Regra pragmática: a posição das LEITURAS é a celebração
 * temporal (domingo/feria), a menos que haja festa/solenidade (grade ≥ 4), que
 * tem leituras próprias. O nome exibível vem depois da fonte de leituras (pt).
 */
export function mapLitcalEvents(events: LitcalRawEvent[], date: string): LiturgyResolution {
  const forDay = events.filter((e) => e.date.slice(0, 10) === date);
  if (forDay.length === 0) throw new Error(`LitCal sem evento para ${date}`);

  const byGrade = [...forDay].sort((a, b) => b.grade - a.grade);
  const primary = byGrade[0]!;
  const temporal = forDay.find((e) => /Sunday|Weekday/.test(e.event_key)) ?? primary;
  const festive = byGrade.find((e) => e.grade >= 4);
  const readingsEvent = festive ?? temporal;

  const dayOfWeek = readingsEvent.day_of_the_week_iso8601 % 7; // ISO 7=domingo → 0
  const isSunday = dayOfWeek === 0;

  const base: LiturgyResolution = {
    date,
    season: SEASONS[readingsEvent.liturgical_season] ?? "ordinary",
    week: parseWeek(readingsEvent.event_key),
    dayOfWeek,
    rank: mapGrade(primary.grade),
    celebration: primary.name,
    color: COLORS[(readingsEvent.color ?? [])[0] ?? ""] ?? "green",
    sundayCycle: parseSundayCycle(readingsEvent.liturgical_year),
    ferialCycle: ferialCycleOf(date),
    eventKey: readingsEvent.event_key,
    fixedReadings: Boolean(festive) && !isSunday,
  };
  return applyBrazilianPropers(base);
}

// ── Dancrf (liturgia.up.railway.app) ─────────────────────────────────────────

interface DancrfReading {
  referencia?: string;
}
interface DancrfRaw {
  liturgia?: string;
  leituras?: Record<string, DancrfReading[] | undefined>;
}

function firstRef(list: DancrfReading[] | undefined): string | null {
  const ref = Array.isArray(list) ? list[0]?.referencia : undefined;
  return ref?.trim() ? ref.trim() : null;
}

/** Extrai só as REFERÊNCIAS (o texto tem copyright) + o nome litúrgico em pt. */
export function parseDancrfReadings(raw: DancrfRaw): DailyReadings {
  const L = raw.leituras ?? {};
  const refs: ReadingRef[] = [];
  const push = (kind: ReadingRef["kind"], list: DancrfReading[] | undefined) => {
    const ref = firstRef(list);
    if (ref) refs.push({ kind, ref });
  };
  push("primeira", L.primeiraLeitura);
  push("salmo", L.salmo);
  push("segunda", L.segundaLeitura);
  push("evangelho", L.evangelho);
  return { refs, celebration: raw.liturgia?.trim() || undefined };
}
