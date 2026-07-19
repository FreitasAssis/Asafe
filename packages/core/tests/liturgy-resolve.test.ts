import { describe, expect, it } from "vitest";
import {
  resolveDailyLiturgy,
  buildSnapshot,
  type LitcalClient,
  type LiturgyProvider,
  type LiturgyCache,
  type DailyReadings,
  type LiturgyResolution,
} from "../src/liturgy";

const RES_16C: LiturgyResolution = {
  date: "2025-07-20",
  season: "ordinary",
  week: 16,
  dayOfWeek: 0,
  rank: "ferial",
  celebration: "16º Domingo do Tempo Comum",
  color: "green",
  sundayCycle: "C",
  ferialCycle: "I",
};

const READINGS: DailyReadings = {
  refs: [
    { kind: "primeira", ref: "Gn 18,1-10a" },
    { kind: "salmo", ref: "Sl 14" },
    { kind: "segunda", ref: "Cl 1,24-28" },
    { kind: "evangelho", ref: "Lc 10,38-42" },
  ],
};

/** Cache em memória com contadores, para provar hit/miss. */
function fakeCache() {
  const days = new Map<string, LiturgyResolution>();
  const lects = new Map<string, DailyReadings>();
  const calls = { getDay: 0, putDay: 0, getLect: 0, putLect: 0 };
  const cache: LiturgyCache = {
    async getDay(date, nation) {
      calls.getDay++;
      return days.get(`${date}|${nation}`) ?? null;
    },
    async putDay(date, nation, res) {
      calls.putDay++;
      days.set(`${date}|${nation}`, res);
    },
    async getLectionary(key, cycle) {
      calls.getLect++;
      return lects.get(`${key}|${cycle}`) ?? null;
    },
    async putLectionary(key, cycle, readings) {
      calls.putLect++;
      lects.set(`${key}|${cycle}`, readings);
    },
  };
  return { cache, calls };
}

function fakeLitcal(res: LiturgyResolution) {
  const calls = { resolve: 0 };
  const litcal: LitcalClient = {
    async resolve() {
      calls.resolve++;
      return res;
    },
  };
  return { litcal, calls };
}

function fakeProvider(readings: DailyReadings) {
  const calls = { getReadings: 0 };
  const provider: LiturgyProvider = {
    async getReadings() {
      calls.getReadings++;
      return readings;
    },
  };
  return { provider, calls };
}

describe("resolveDailyLiturgy — cache hit/miss", () => {
  it("MISS: resolve via LitCal + provider e grava os dois caches", async () => {
    const { cache, calls: c } = fakeCache();
    const { litcal, calls: lc } = fakeLitcal(RES_16C);
    const { provider, calls: pc } = fakeProvider(READINGS);

    const out = await resolveDailyLiturgy("2025-07-20", { litcal, provider, cache });

    expect(lc.resolve).toBe(1);
    expect(pc.getReadings).toBe(1);
    expect(c.putDay).toBe(1);
    expect(c.putLect).toBe(1);
    expect(out.key).toBe("ordinary-16-sun");
    expect(out.cycle).toBe("C");
    expect(out.readings.refs).toHaveLength(4);
  });

  it("HIT: 2ª chamada NÃO bate na LitCal nem no provider", async () => {
    const { cache } = fakeCache();
    const { litcal, calls: lc } = fakeLitcal(RES_16C);
    const { provider, calls: pc } = fakeProvider(READINGS);
    const deps = { litcal, provider, cache };

    await resolveDailyLiturgy("2025-07-20", deps);
    await resolveDailyLiturgy("2025-07-20", deps); // segunda vez

    expect(lc.resolve).toBe(1); // não subiu
    expect(pc.getReadings).toBe(1); // não subiu
  });

  it("aplica o próprio do Brasil na resolução (Aparecida)", async () => {
    const { cache } = fakeCache();
    const feria12out: LiturgyResolution = {
      ...RES_16C,
      date: "2025-10-12",
      dayOfWeek: 0,
      celebration: "28º Domingo do Tempo Comum",
    };
    const { litcal } = fakeLitcal(feria12out);
    const { provider } = fakeProvider(READINGS);

    const out = await resolveDailyLiturgy("2025-10-12", { litcal, provider, cache });
    expect(out.resolution.properKey).toBe("aparecida");
    expect(out.key).toBe("aparecida");
    expect(out.cycle).toBe("-");
  });
});

describe("buildSnapshot", () => {
  it("congela identidade + rótulos + referências (sem texto pesado)", async () => {
    const { cache } = fakeCache();
    const { litcal } = fakeLitcal(RES_16C);
    const { provider } = fakeProvider(READINGS);
    const out = await resolveDailyLiturgy("2025-07-20", { litcal, provider, cache });

    const snap = buildSnapshot(out);
    expect(snap.key).toBe("ordinary-16-sun");
    expect(snap.cycle).toBe("C");
    expect(snap.celebration).toBe("16º Domingo do Tempo Comum");
    expect(snap.season).toBe("ordinary");
    expect(snap.color).toBe("green");
    expect(snap.readings).toEqual(READINGS.refs);
    // só referências, nada de texto integral
    expect(JSON.stringify(snap)).not.toContain("texto");
  });
});
