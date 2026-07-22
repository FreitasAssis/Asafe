"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { copyRepertoireItemsInto, repertoiresForKey, type AnchorRepertoire } from "@/lib/repertoires";

/**
 * Reaproveitar pela âncora (A5): numa Missa recém-criada, oferece começar a partir
 * de um repertório da MESMA celebração — os seus/do grupo e os da comunidade
 * aprovados. "Usar como base" clona o arranjo no repertório atual. O frescor (já
 * exibido nas músicas) guia depois o que trocar.
 */
export function ReuseAnchor({
  currentId,
  liturgicalKey,
  celebration,
  userId,
}: {
  readonly currentId: string;
  readonly liturgicalKey: string;
  readonly celebration: string;
  readonly userId: string;
}) {
  const [matches, setMatches] = useState<AnchorRepertoire[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void repertoiresForKey(browserClient(), liturgicalKey, currentId)
      .then((r) => alive && setMatches(r))
      .catch(() => alive && setMatches([]));
    return () => {
      alive = false;
    };
  }, [liturgicalKey, currentId]);

  if (!matches || matches.length === 0) return null;

  const mine = matches.filter((m) => m.mine);
  const community = matches.filter((m) => !m.mine);

  async function applyBase(sourceId: string) {
    setBusy(sourceId);
    setError(null);
    try {
      await copyRepertoireItemsInto(browserClient(), sourceId, currentId, userId);
      // Recarrega: o construtor inicia `items` uma vez do servidor; um refresh não
      // reinicia esse estado, então uma recarga reflete o arranjo clonado.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao reaproveitar.");
      setBusy(null);
    }
  }

  function Group({ title, items }: { readonly title: string; readonly items: AnchorRepertoire[] }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{title}</div>
        <ul style={{ listStyle: "none", margin: "2px 0 0", padding: 0 }}>
          {items.map((m) => (
            <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
              <a href={`/repertorios/${m.id}`} style={{ fontSize: 14 }}>
                {m.title}
              </a>
              {m.date && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {m.date}</span>}
              {!m.mine && m.authorName && (
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {m.authorName}</span>
              )}
              <button
                type="button"
                onClick={() => void applyBase(m.id)}
                disabled={busy !== null}
                style={{ fontSize: 12, color: "var(--primary)" }}
              >
                {busy === m.id ? "copiando…" : "usar como base"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section
      style={{
        marginTop: 12,
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface, transparent)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>
        🔁 Você já tem repertório para {celebration}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Comece a partir de um deles — depois é só ajustar.
      </div>
      <Group title="Seus e do seu grupo" items={mine} />
      <Group title="Da comunidade" items={community} />
      {error && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </section>
  );
}
