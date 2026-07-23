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
  const [error, setError] = useState<string | null>(null);

  async function del() {
    if (busy || !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      // Antes o erro era engolido (nenhum retorno visual). Agora mostra o motivo
      // (ex.: música em uso num repertório).
      setError(e instanceof Error ? e.message : "Não foi possível excluir.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex shrink-0 flex-col items-end gap-0.5">
      <span className="inline-flex gap-1.5">
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
      {error && (
        <span className="text-right text-danger" style={{ fontSize: 11, maxWidth: 220 }}>
          {error}
        </span>
      )}
    </span>
  );
}
