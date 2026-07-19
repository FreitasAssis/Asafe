import {
  type LitcalClient,
  type LitcalRawEvent,
  liturgicalYearOf,
  mapLitcalEvents,
} from "@asafe/core";

const BASE =
  process.env.LITCAL_API_URL ?? "https://litcal.johnromanodorazio.com/api/dev";

/**
 * Client da LitCal (Geral Romano). O endpoint `/calendar/{ano}` devolve o ANO
 * LITÚRGICO inteiro (do 1º Domingo do Advento em diante), por isso buscamos pelo
 * ano litúrgico da data. O cache em `liturgical_day` faz isso rodar 1x por data.
 */
export function litcalClient(): LitcalClient {
  return {
    async resolve(date) {
      const year = liturgicalYearOf(date);
      const res = await fetch(`${BASE}/calendar/${year}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`LitCal ${res.status} para ${date}`);
      const body = (await res.json()) as { litcal?: LitcalRawEvent[] };
      return mapLitcalEvents(body.litcal ?? [], date);
    },
  };
}
