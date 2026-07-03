"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTRIBUTION_CHOICES,
  ATTRIBUTION_HINTS,
  ATTRIBUTION_LABELS,
  ATTRIBUTION_TO_STATUS,
  attributionWarning,
  suggestAttribution,
  type AttributionChoice,
} from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { classifySong, requestPublishSong } from "@/lib/songs";

/**
 * Gate de promoção de uma MÚSICA ao global: antes de propor, o dono declara a autoria
 * (define o copyright_status). Texto curto explica o "por que" — clareia, não bloqueia.
 */
export function PublishGate({
  songId,
  composer,
  onCancel,
}: {
  readonly songId: string;
  readonly composer: string | null;
  readonly onCancel: () => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<AttributionChoice | null>(null);
  const [busy, setBusy] = useState(false);
  // Heurística (C6): sugere pela ficha de compositor e avisa contradições — não bloqueia.
  const suggestion = suggestAttribution(composer);
  const warning = choice ? attributionWarning(choice, composer) : null;

  async function confirm() {
    if (!choice) return;
    setBusy(true);
    try {
      const sb = browserClient();
      await classifySong(sb, songId, ATTRIBUTION_TO_STATUS[choice]);
      await requestPublishSong(sb, songId);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded border border-border p-3">
      <p className="text-sm text-muted">
        Ao sugerir, o <strong>título e as informações</strong> desta música ficam visíveis a todos —
        ajuda a comunidade a encontrar o que já existe. A <strong>cifra completa</strong> só aparece
        para os outros quando a música é <strong>livre</strong>. Por isso pedimos que complete algumas informações:
      </p>
      {suggestion && (
        <p className="mt-2 text-xs text-muted">
          Pela ficha de compositor{composer ? ` (${composer})` : ""}, o provável é{" "}
          <strong>{ATTRIBUTION_LABELS[suggestion]}</strong>.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {ATTRIBUTION_CHOICES.map((c) => (
          <label
            key={c}
            className={`cursor-pointer rounded border p-2 ${choice === c ? "border-primary" : "border-border"}`}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name="attr" checked={choice === c} onChange={() => setChoice(c)} />
              <strong className="text-sm">{ATTRIBUTION_LABELS[c]}</strong>
            </span>
            <span className="mt-1 block text-xs text-muted">{ATTRIBUTION_HINTS[c]}</span>
          </label>
        ))}
      </div>
      {warning && (
        <p
          className="mt-3 rounded p-2 text-sm"
          style={{ color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" }}
        >
          ⚠ {warning}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!choice || busy}
          onClick={() => void confirm()}
        >
          {busy ? "Enviando…" : "Confirmar e sugerir"}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
