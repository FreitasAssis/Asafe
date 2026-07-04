import type { ModerationDecision, ModerationReason } from "./moderation";

/** Estado de publicação de uma música/repertório na comunidade (casa com `community_status`). */
export type CommunityStatus = "none" | "pending" | "approved" | "rejected" | "returned";

/** Rótulo curto do status, para badges e a visão "meus envios". */
export const COMMUNITY_STATUS_LABELS: Record<CommunityStatus, string> = {
  none: "Não enviado",
  pending: "Aguardando aprovação",
  approved: "Publicado",
  rejected: "Não aprovado",
  returned: "Devolvido para ajuste",
};

/** Tom semântico do status (a cor concreta é decidida na camada de UI). */
export type StatusTone = "neutral" | "info" | "success" | "danger" | "warning";
export const COMMUNITY_STATUS_TONE: Record<CommunityStatus, StatusTone> = {
  none: "neutral",
  pending: "info",
  approved: "success",
  rejected: "danger",
  returned: "warning",
};

/** Evento de moderação (forma enxuta lida pelo proponente — RLS libera os do próprio alvo). */
export interface ModerationEventLite {
  targetId: string;
  decision: ModerationDecision;
  reason: ModerationReason | null;
  note: string | null;
  createdAt: string;
}

/**
 * Reduz uma lista de eventos ao **último por alvo** (maior `createdAt`). É o que alimenta a
 * devolutiva ("por que foi devolvido/recusado") na visão de envios. Independe da ordem de
 * entrada — compara sempre o `createdAt` (ISO, comparável lexicograficamente).
 */
export function latestEventPerTarget(
  events: readonly ModerationEventLite[],
): Map<string, ModerationEventLite> {
  const byTarget = new Map<string, ModerationEventLite>();
  for (const e of events) {
    const prev = byTarget.get(e.targetId);
    if (!prev || e.createdAt > prev.createdAt) byTarget.set(e.targetId, e);
  }
  return byTarget;
}
