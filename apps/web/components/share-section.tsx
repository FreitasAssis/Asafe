"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { createShareLink, revokeShareLink, type ShareLink } from "@/lib/share-links";

/** Compartilhar o repertório por link público (gerar / Web Share / copiar / revogar). */
export function ShareSection({
  repertoireId,
  initialLinks,
}: {
  readonly repertoireId: string;
  readonly initialLinks: ShareLink[];
}) {
  const [links, setLinks] = useState<ShareLink[]>(initialLinks);
  const [expiry, setExpiry] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const urlFor = (token: string) => `${window.location.origin}/r/${token}`;

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      const link = await createShareLink(browserClient(), repertoireId, expiry.trim() || null);
      setLinks((prev) => [...prev, link]);
      const url = urlFor(link.token);
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Repertório — Asafe", url });
        } catch {
          // usuário cancelou a bandeja — ok
        }
      } else {
        await navigator.clipboard.writeText(url);
        setMsg("Link copiado!");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao gerar link.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    setMsg("Link copiado!");
  }

  async function revoke(id: string) {
    try {
      await revokeShareLink(browserClient(), id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao revogar.");
    }
  }

  return (
    <section
      style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong>Compartilhar</strong>
        <label style={{ fontSize: 12, color: "#666" }}>
          validade (opcional){" "}
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </label>
        <button type="button" onClick={() => void generate()} disabled={busy}>
          {busy ? "…" : "Gerar link"}
        </button>
        {msg && <span style={{ fontSize: 12, color: "#2a7" }}>{msg}</span>}
      </div>

      {links.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
          {links.map((l) => (
            <li key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                /r/{l.token.slice(0, 12)}…
              </code>
              {l.expiresAt && <span style={{ color: "#888" }}>até {l.expiresAt}</span>}
              <button type="button" onClick={() => void copy(l.token)}>
                copiar
              </button>
              <button type="button" onClick={() => void revoke(l.id)} style={{ color: "#c00" }}>
                revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
