"use server";

import type { RepertoireType } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { resolveForDate, buildSnapshot } from "@/lib/liturgy/resolve";

/**
 * Salva título + data de um repertório e, para Missa, RE-RESOLVE a liturgia pela data:
 *  - com data  → re-congela o snapshot (leituras/tempo/cor da nova data);
 *  - sem data  → limpa o snapshot (fica dinâmico: a visualização resolve "hoje").
 *
 * Server-side porque a resolução usa LitCal/Dancrf + cache via service-role. Degrada sem
 * travar (fonte falhou → limpa o snapshot; a data é salva de qualquer jeito). A RLS garante
 * que só o dono/editor grava.
 */
export async function saveRepertoireMetaAction(input: {
  id: string;
  title: string;
  date: string | null;
}): Promise<{ liturgyResolved: boolean }> {
  const supabase = await serverClient();
  const { data: rep } = await supabase
    .from("repertoire")
    .select("type")
    .eq("id", input.id)
    .maybeSingle();
  const type = (rep as { type: RepertoireType } | null)?.type;

  const patch: Record<string, unknown> = { title: input.title, date: input.date };
  let liturgyResolved = false;

  if (type === "Missa") {
    if (input.date) {
      try {
        const resolved = await resolveForDate(input.date);
        patch.liturgical_key = resolved.key;
        patch.liturgical_snapshot = buildSnapshot(resolved);
        liturgyResolved = true;
      } catch (e) {
        console.error(`[liturgia] re-resolução falhou para ${input.date} (limpando):`, e);
        patch.liturgical_key = null;
        patch.liturgical_snapshot = null;
      }
    } else {
      // Sem data: dinâmico. Zera o congelado para não mostrar leituras de uma data antiga.
      patch.liturgical_key = null;
      patch.liturgical_snapshot = null;
    }
  }

  const { error } = await supabase.from("repertoire").update(patch).eq("id", input.id);
  if (error) throw error;
  return { liturgyResolved };
}
