"use client";

import { useState } from "react";

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
    <span className="inline-flex shrink-0 gap-1.5">
      <a href={editHref} title="Editar" aria-label="Editar" className="icon-btn">
        ✏️
      </a>
      <button
        type="button"
        onClick={() => void del()}
        disabled={busy}
        title="Excluir"
        aria-label="Excluir"
        className="icon-btn text-danger"
      >
        🗑️
      </button>
    </span>
  );
}
