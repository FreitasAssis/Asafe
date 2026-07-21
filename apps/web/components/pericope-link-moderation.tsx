"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepLink, unlinkSong, type PendingLink } from "@/lib/liturgy/pericope-actions";

/**
 * Fila REATIVA dos vínculos música↔leitura (A4): eles já estão públicos desde a
 * criação — aqui o moderador só decide entre REMOVER o vínculo ou MANTER (o que
 * apenas o tira da fila, sem mudar nada para quem vê).
 */
export function PericopeLinkModeration({ initial }: { readonly initial: PendingLink[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(linkId: string, action: "keep" | "remove") {
    setBusy(linkId);
    setError(null);
    try {
      if (action === "keep") await keepLink(linkId);
      else await unlinkSong(linkId);
      setItems((cur) => cur.filter((i) => i.linkId !== linkId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar.");
    }
    setBusy(null);
  }

  if (items.length === 0) {
    return <p className="mt-2 text-muted">Nenhum vínculo para revisar.</p>;
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        Estes vínculos <strong>já estão visíveis</strong> para todos. Revise para remover o que não
        faz sentido — “Manter” só tira da fila.
      </p>
      <ul className="mt-2 list-none p-0">
        {items.map((i) => (
          <li
            key={i.linkId}
            className="flex flex-wrap items-center gap-2 border-b border-border py-2"
          >
            <div className="flex-1">
              <a href={`/musicas/${i.songId}`} className="font-semibold">
                {i.songTitle}
              </a>
              <span className="text-muted"> · {i.readingLabel}</span>
              {i.suggestedMoment && <span className="text-muted"> · {i.suggestedMoment}</span>}
              <div className="text-sm text-muted">por {i.authorName}</div>
            </div>
            <button
              type="button"
              className="btn"
              disabled={busy === i.linkId}
              onClick={() => void act(i.linkId, "keep")}
            >
              Manter
            </button>
            <button
              type="button"
              className="btn"
              style={{ color: "var(--danger)" }}
              disabled={busy === i.linkId}
              onClick={() => void act(i.linkId, "remove")}
            >
              Remover vínculo
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-danger">{error}</p>}
    </>
  );
}
