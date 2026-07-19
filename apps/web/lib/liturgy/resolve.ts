import { resolveDailyLiturgy, type ResolvedLiturgy } from "@asafe/core";
import { litcalClient } from "./litcal";
import { compositeProvider, dancrfProvider } from "./provider";
import { supabaseLiturgyCache } from "./cache";

export { buildSnapshot } from "@asafe/core";

/**
 * Resolve o dia litúrgico de uma data (com cache em duas camadas), montando os
 * adapters reais (LitCal + Dancrf + Supabase service-role). Server-only.
 */
export async function resolveForDate(date: string): Promise<ResolvedLiturgy> {
  return resolveDailyLiturgy(date, {
    litcal: litcalClient(),
    provider: compositeProvider(dancrfProvider()),
    cache: supabaseLiturgyCache(),
  });
}
