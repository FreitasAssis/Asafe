"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { moderateRepertoire } from "@/lib/repertoires";
import { moderateSong } from "@/lib/songs";

export interface ModItem {
  id: string;
  title: string;
  subtitle: string;
}

/** Fila de moderação (repertórios ou músicas): revisar em leitura + aprovar/recusar. */
export function ModerationList({
  items,
  kind,
}: {
  readonly items: ModItem[];
  readonly kind: "repertoire" | "song";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const moderate = kind === "song" ? moderateSong : moderateRepertoire;
  const viewHref = (id: string) => (kind === "song" ? `/musicas/${id}` : `/repertorios/${id}`);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      await moderate(browserClient(), id, decision);
      router.refresh();
    } catch {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="mt-2 text-muted">Nada pendente.</p>;
  }

  return (
    <ul className="mt-2 list-none p-0">
      {items.map((it) => (
        <li key={it.id} className="flex flex-wrap items-center gap-3 border-b border-border py-3">
          <div className="flex-1">
            <a href={viewHref(it.id)} className="font-semibold">
              {it.title}
            </a>
            <span className="text-muted"> — {it.subtitle}</span>
          </div>
          <a href={viewHref(it.id)} className="btn">
            Revisar
          </a>
          <button type="button" className="btn btn-primary" disabled={busy === it.id} onClick={() => void decide(it.id, "approve")}>
            Aprovar
          </button>
          <button type="button" className="btn btn-danger" disabled={busy === it.id} onClick={() => void decide(it.id, "reject")}>
            Recusar
          </button>
        </li>
      ))}
    </ul>
  );
}
