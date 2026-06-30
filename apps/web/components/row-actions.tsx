"use client";

import { useState } from "react";

const ICON: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  textDecoration: "none",
  fontSize: 14,
  lineHeight: 1,
};

/** Ações por linha de lista: lápis (editar) + lixeira (excluir). Mostre só a quem pode. */
export function RowActions({
  editHref,
  onDelete,
  confirmText,
}: {
  readonly editHref: string;
  readonly onDelete: () => Promise<void>;
  readonly confirmText: string;
}) {
  const [busy, setBusy] = useState(false);

  async function del() {
    if (busy || !confirm(confirmText)) return;
    setBusy(true);
    try {
      await onDelete();
    } catch {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
      <a href={editHref} title="Editar" aria-label="Editar" style={ICON}>
        ✏️
      </a>
      <button
        type="button"
        onClick={() => void del()}
        disabled={busy}
        title="Excluir"
        aria-label="Excluir"
        style={{ ...ICON, color: "#c00", cursor: busy ? "default" : "pointer" }}
      >
        🗑️
      </button>
    </span>
  );
}
