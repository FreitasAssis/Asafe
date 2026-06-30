import { freshnessLabel, type FreshnessLevel } from "@asafe/core";

const COLOR: Record<FreshnessLevel, string> = {
  fresca: "#059669", // verde — nunca/há muito
  recente: "#d97706", // âmbar — cantou faz pouco (atenção)
  ok: "var(--text-muted)", // neutro
};

/** Rótulo de frescor ("há 3 semanas" / "nunca usada") colorido por nível. */
export function FreshnessTag({ lastUsed }: { lastUsed: string | null }) {
  const { label, level } = freshnessLabel(
    lastUsed ? new Date(lastUsed) : null,
    new Date(),
  );
  return <span style={{ fontSize: 11, color: COLOR[level] }}>{label}</span>;
}
