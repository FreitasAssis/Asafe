import type { DailyReadings, LiturgyCache, LiturgyResolution } from "@asafe/core";
import { liturgyServiceClient } from "./service";

/**
 * Cache litúrgico em Postgres (as duas camadas do §6), escrito via service-role.
 * `liturgical_day.data` guarda a resolução; `lectionary.readings` guarda só as
 * referências (+ nome pt), nunca o texto integral.
 */
export function supabaseLiturgyCache(): LiturgyCache {
  const svc = liturgyServiceClient();
  return {
    async getDay(date, nation) {
      const { data } = await svc
        .from("liturgical_day")
        .select("data")
        .eq("date", date)
        .eq("nation", nation)
        .maybeSingle();
      return (data?.data as LiturgyResolution | undefined) ?? null;
    },
    async putDay(date, nation, res) {
      const { error } = await svc
        .from("liturgical_day")
        .upsert({ date, nation, data: res }, { onConflict: "date,nation" });
      if (error) throw error;
    },
    async getLectionary(key, cycle) {
      const { data } = await svc
        .from("lectionary")
        .select("readings")
        .eq("liturgical_key", key)
        .eq("cycle", cycle)
        .maybeSingle();
      return (data?.readings as DailyReadings | undefined) ?? null;
    },
    async putLectionary(key, cycle, readings) {
      const { error } = await svc
        .from("lectionary")
        .upsert(
          { liturgical_key: key, cycle, readings },
          { onConflict: "liturgical_key,cycle" },
        );
      if (error) throw error;
    },
  };
}
