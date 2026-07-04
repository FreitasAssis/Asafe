"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MODERATION_REASON_LABELS,
  MODERATION_REASONS,
  type ModerationDecision,
  type ModerationReason,
} from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { moderateRepertoire } from "@/lib/repertoires";
import { moderateSong } from "@/lib/songs";

export interface ModItem {
  id: string;
  title: string;
  subtitle: string;
}

/** Fila de moderação (repertórios ou músicas): revisar + aprovar/recusar/devolver.
 * Recusar e devolver capturam um motivo estruturado (+ nota) que vira devolutiva/log. */
export function ModerationList({
  items,
  kind,
}: {
  readonly items: ModItem[];
  readonly kind: "repertoire" | "song";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  // Item + decisão em captura de motivo (recusar/devolver mostram o form inline).
  const [capture, setCapture] = useState<{ id: string; decision: "reject" | "return" } | null>(null);
  const [reason, setReason] = useState<ModerationReason>(MODERATION_REASONS[0]!);
  const [note, setNote] = useState("");
  const moderate = kind === "song" ? moderateSong : moderateRepertoire;
  // Leva o contexto "vim da moderação" para a tela de revisão ajustar o breadcrumb.
  const viewHref = (id: string) =>
    (kind === "song" ? `/musicas/${id}` : `/repertorios/${id}`) + "?from=moderacao";

  async function decide(id: string, decision: ModerationDecision, r?: ModerationReason, n?: string) {
    setBusy(id);
    try {
      await moderate(browserClient(), id, decision, r, n);
      setCapture(null);
      setNote("");
      router.refresh();
    } catch {
      setBusy(null);
    }
  }

  function openCapture(id: string, decision: "reject" | "return") {
    setCapture({ id, decision });
    setReason(MODERATION_REASONS[0]!);
    setNote("");
  }

  if (items.length === 0) {
    return <p className="mt-2 text-muted">Nada pendente.</p>;
  }

  return (
    <ul className="mt-2 list-none p-0">
      {items.map((it) => {
        const capturing = capture?.id === it.id;
        return (
          <li key={it.id} className="border-b border-border py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <a href={viewHref(it.id)} className="font-semibold">
                  {it.title}
                </a>
                <span className="text-muted"> — {it.subtitle}</span>
              </div>
              <a href={viewHref(it.id)} className="btn">
                Revisar
              </a>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy === it.id}
                onClick={() => void decide(it.id, "approve")}
              >
                Aprovar
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy === it.id}
                onClick={() => openCapture(it.id, "return")}
              >
                Devolver
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy === it.id}
                onClick={() => openCapture(it.id, "reject")}
              >
                Recusar
              </button>
            </div>

            {capturing && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-border p-3">
                <span className="text-sm font-semibold">
                  {capture!.decision === "return" ? "Devolver para ajuste" : "Recusar"} — motivo:
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ModerationReason)}
                  className="text-sm"
                >
                  {MODERATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {MODERATION_REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="nota (opcional)"
                  className="input flex-1 text-sm"
                />
                <button
                  type="button"
                  className={capture!.decision === "return" ? "btn" : "btn btn-danger"}
                  disabled={busy === it.id}
                  onClick={() => void decide(it.id, capture!.decision, reason, note)}
                >
                  Confirmar
                </button>
                <button type="button" className="btn" onClick={() => setCapture(null)}>
                  Cancelar
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
