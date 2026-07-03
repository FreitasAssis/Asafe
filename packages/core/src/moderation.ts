/** Motivo estruturado de uma decisão de moderação (casa com o enum `moderation_reason`). */
export type ModerationReason =
  | "autoria_status_incorreto"
  | "protegida_sem_permissao"
  | "duplicada"
  | "qualidade_cifra"
  | "outro";

export const MODERATION_REASONS: readonly ModerationReason[] = [
  "autoria_status_incorreto",
  "protegida_sem_permissao",
  "duplicada",
  "qualidade_cifra",
  "outro",
];

export const MODERATION_REASON_LABELS: Record<ModerationReason, string> = {
  autoria_status_incorreto: "Autoria/status incorreto",
  protegida_sem_permissao: "Protegida sem permissão",
  duplicada: "Duplicada",
  qualidade_cifra: "Qualidade da cifra",
  outro: "Outro",
};

/** Decisão do moderador. `return` devolve para ajuste (o proponente pode reenviar). */
export type ModerationDecision = "approve" | "reject" | "return" | "revoke";
