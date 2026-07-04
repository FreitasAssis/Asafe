"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  latestEventPerTarget,
  MODERATION_REASON_LABELS,
  type ModerationEventLite,
} from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { listMyModerationEvents } from "@/lib/community";
import { requestPublish, withdrawPublish, type CommunityStatus } from "@/lib/repertoires";
import { requestPublishSong, withdrawPublishSong } from "@/lib/songs";
import { PublishGate } from "./publish-gate";

/** Seção "Comunidade" (só dono): sugerir à comunidade / retirar / reenviar. Repertório ou música.
 * Para MÚSICA, sugerir abre o gate de direitos (declarar autoria) antes de propor. */
export function CommunitySection({
  id,
  status,
  kind,
  composer = null,
}: {
  readonly id: string;
  readonly status: CommunityStatus;
  readonly kind: "repertoire" | "song";
  readonly composer?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(false);
  // Devolutiva (§6.1): quando devolvido/rejeitado, mostra o motivo/nota da última decisão.
  const [feedback, setFeedback] = useState<ModerationEventLite | null>(null);
  const showsFeedback = status === "returned" || status === "rejected";
  useEffect(() => {
    if (!showsFeedback) {
      setFeedback(null);
      return;
    }
    let alive = true;
    void listMyModerationEvents(browserClient(), [id]).then((events) => {
      if (alive) setFeedback(latestEventPerTarget(events).get(id) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id, showsFeedback]);
  const noun = kind === "song" ? "esta música" : "este repertório";
  const request = kind === "song" ? requestPublishSong : requestPublish;
  const withdraw = kind === "song" ? withdrawPublishSong : withdrawPublish;

  async function act(fn: typeof request) {
    setBusy(true);
    try {
      await fn(browserClient(), id);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  // Música passa pelo gate (declarar direitos); repertório propõe direto.
  function startSuggest() {
    if (kind === "song") setGate(true);
    else void act(request);
  }

  const suggestBtn = (label: string) => (
    <button type="button" className="btn btn-primary" disabled={busy} onClick={startSuggest}>
      {label}
    </button>
  );

  return (
    <section className="card mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <strong className="font-serif">Comunidade</strong>
        {status === "none" && (
          <>
            <span className="flex-1 text-sm text-muted">
              Compartilhe {noun} com todos — passa por moderação antes de aparecer.
            </span>
            {suggestBtn("Sugerir à comunidade")}
          </>
        )}
        {status === "pending" && (
          <>
            <span className="flex-1 text-sm text-muted">Enviado — aguardando aprovação da moderação.</span>
            <button type="button" className="btn" disabled={busy} onClick={() => void act(withdraw)}>
              Retirar
            </button>
          </>
        )}
        {status === "approved" && (
          <>
            <span className="flex-1 text-sm" style={{ color: "var(--season)" }}>
              Publicado na comunidade ✓
            </span>
            <button type="button" className="btn" disabled={busy} onClick={() => void act(withdraw)}>
              Retirar da comunidade
            </button>
          </>
        )}
        {status === "rejected" && (
          <>
            <span className="flex-1 text-sm text-muted">Não aprovado pela moderação.</span>
            {suggestBtn("Sugerir de novo")}
          </>
        )}
        {status === "returned" && (
          <>
            <span className="flex-1 text-sm text-muted">Devolvido para ajuste — corrija e reenvie.</span>
            {suggestBtn("Reenviar")}
          </>
        )}
      </div>

      {showsFeedback && feedback && (feedback.reason || feedback.note) && (
        <div
          className="mt-3 rounded p-3 text-sm"
          style={{ color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" }}
        >
          <strong>Retorno da moderação</strong>
          {feedback.reason && (
            <p className="mt-1">Motivo: {MODERATION_REASON_LABELS[feedback.reason]}</p>
          )}
          {feedback.note && <p className="mt-1 whitespace-pre-line">{feedback.note}</p>}
        </div>
      )}

      {gate && kind === "song" && (
        <PublishGate songId={id} composer={composer} onCancel={() => setGate(false)} />
      )}
    </section>
  );
}
