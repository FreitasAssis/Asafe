import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModerationDecision, ModerationEventLite, ModerationReason } from "@asafe/core";

/**
 * Eventos de moderação dos alvos informados (músicas/repertórios). A RLS de
 * `moderation_event` já limita ao **dono do alvo** — logo o proponente só recebe os
 * eventos das próprias submissões. Alimenta a devolutiva ("por que foi devolvido/recusado").
 */
export async function listMyModerationEvents(
  supabase: SupabaseClient,
  targetIds: string[],
): Promise<ModerationEventLite[]> {
  if (targetIds.length === 0) return [];
  const { data, error } = await supabase
    .from("moderation_event")
    .select("target_id, decision, reason, note, created_at")
    .in("target_id", targetIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    data as {
      target_id: string;
      decision: ModerationDecision;
      reason: ModerationReason | null;
      note: string | null;
      created_at: string;
    }[]
  ).map((e) => ({
    targetId: e.target_id,
    decision: e.decision,
    reason: e.reason,
    note: e.note,
    createdAt: e.created_at,
  }));
}
