"use server";

import type { RepertoireType } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { createRepertoire } from "@/lib/repertoires";
import { buildSnapshot, resolveForDate } from "@/lib/liturgy/resolve";

/**
 * Cria um repertório e, para Missa com data, resolve a liturgia do dia e grava o
 * snapshot (server-side, pois usa a LitCal/Dancrf + escrita no cache via
 * service-role). Falha de resolução DEGRADA sem travar (A2): o repertório é
 * criado mesmo assim, com os campos litúrgicos vazios.
 */
export async function createRepertoireAction(input: {
  title: string;
  type: RepertoireType;
  date: string | null;
}): Promise<{ id: string; liturgyResolved: boolean }> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { id } = await createRepertoire(supabase, user.id, input);

  if (input.type !== "Missa" || !input.date) return { id, liturgyResolved: false };

  try {
    const resolved = await resolveForDate(input.date);
    const snapshot = buildSnapshot(resolved);
    const { error } = await supabase
      .from("repertoire")
      .update({ liturgical_key: resolved.key, liturgical_snapshot: snapshot })
      .eq("id", id);
    if (error) throw error;
    return { id, liturgyResolved: true };
  } catch (e) {
    // Degrada: a Missa fica criada, liturgia vazia (pode reprocessar depois).
    console.error(`[liturgia] resolução falhou para ${input.date} (degradando):`, e);
    return { id, liturgyResolved: false };
  }
}
