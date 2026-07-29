import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiturgicalSnapshot, RepertoireType } from "@asafe/core";
import { getRepertoirePackage } from "@/lib/repertoires";
import type { SharedPackage } from "@/components/public-repertoire";
import { resolveForDate, buildSnapshot } from "@/lib/liturgy/resolve";

/**
 * Missa **sem data** → liturgia de **hoje** (dinâmico, NÃO persistido): um repertório-modelo
 * repetido nas missas da semana mostra as leituras do dia em que é aberto. Só resolve quando
 * não há snapshot congelado e não há data; degrada para o atual/null sem travar. Server-only.
 */
export async function dynamicTodaySnapshot(
  type: RepertoireType,
  date: string | null,
  current: LiturgicalSnapshot | null,
): Promise<LiturgicalSnapshot | null> {
  if (current || type !== "Missa" || date) return current;
  try {
    const today = new Date().toISOString().slice(0, 10);
    return buildSnapshot(await resolveForDate(today));
  } catch (e) {
    console.error("[liturgia] resolução dinâmica (hoje) falhou (degradando):", e);
    return null;
  }
}

/**
 * Carrega o pacote de palco (view / ao vivo / projeção) já com a liturgia dinâmica de hoje
 * injetada para Missa sem data. Wrapper server-only sobre `getRepertoirePackage`.
 */
export async function getStagePackage(
  supabase: SupabaseClient,
  id: string,
): Promise<SharedPackage | null> {
  const pkg = await getRepertoirePackage(supabase, id);
  if (!pkg) return null;
  const snapshot = await dynamicTodaySnapshot(
    pkg.repertoire.type,
    pkg.repertoire.date,
    pkg.repertoire.liturgicalSnapshot ?? null,
  );
  return { ...pkg, repertoire: { ...pkg.repertoire, liturgicalSnapshot: snapshot } };
}
