"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { cloneCommunityRepertoire } from "@/lib/repertoires";

/**
 * "Pegar este repertório": clona o arranjo da comunidade para os meus (C8) e abre o meu clone.
 * O conteúdo obedece a referência×conteúdo — músicas que já tenho/posso ver vêm cheias; as
 * protegidas entram como referência para "digitar uma vez".
 */
export function TakeRepertoireButton({
  sourceId,
  userId,
}: {
  readonly sourceId: string;
  readonly userId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take() {
    setBusy(true);
    setError(null);
    try {
      const newId = await cloneCommunityRepertoire(browserClient(), sourceId, userId);
      router.push(`/repertorios/${newId}/editar`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao pegar o repertório.");
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void take()}>
        {busy ? "Pegando…" : "Pegar este repertório"}
      </button>
      {error && <span style={{ color: "var(--danger)" }}>{error}</span>}
    </span>
  );
}
