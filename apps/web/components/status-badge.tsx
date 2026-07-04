import {
  COMMUNITY_STATUS_LABELS,
  COMMUNITY_STATUS_TONE,
  type CommunityStatus,
  type StatusTone,
} from "@asafe/core";

const TONE_STYLE: Record<Exclude<StatusTone, "neutral">, { color: string; background: string; border: string }> = {
  info: { color: "#1e40af", background: "#dbeafe", border: "#bfdbfe" },
  success: { color: "#166534", background: "#dcfce7", border: "#bbf7d0" },
  danger: { color: "#991b1b", background: "#fee2e2", border: "#fecaca" },
  warning: { color: "#92400e", background: "#fef3c7", border: "#fcd34d" },
};

/** Selo curto do status na comunidade. Não renderiza nada quando o item não foi enviado. */
export function StatusBadge({ status }: { readonly status: CommunityStatus }) {
  const tone = COMMUNITY_STATUS_TONE[status];
  if (tone === "neutral") return null;
  const s = TONE_STYLE[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: s.color,
        background: s.background,
        border: `1px solid ${s.border}`,
      }}
    >
      {COMMUNITY_STATUS_LABELS[status]}
    </span>
  );
}
