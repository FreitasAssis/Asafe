"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { requestPublish, withdrawPublish, type CommunityStatus } from "@/lib/repertoires";
import { requestPublishSong, withdrawPublishSong } from "@/lib/songs";

/** Seção "Comunidade" (só dono): sugerir à comunidade / retirar / reenviar. Repertório ou música. */
export function CommunitySection({
  id,
  status,
  kind,
}: {
  readonly id: string;
  readonly status: CommunityStatus;
  readonly kind: "repertoire" | "song";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
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

  return (
    <section className="card mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <strong className="font-serif">Comunidade</strong>
        {status === "none" && (
          <>
            <span className="flex-1 text-sm text-muted">
              Compartilhe {noun} com todos — passa por moderação antes de aparecer.
            </span>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void act(request)}>
              Sugerir à comunidade
            </button>
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
            <button type="button" className="btn" disabled={busy} onClick={() => void act(request)}>
              Sugerir de novo
            </button>
          </>
        )}
      </div>
    </section>
  );
}
