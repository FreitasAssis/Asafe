"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { requestJoin } from "@/lib/groups";

/** Pedir para entrar num grupo via token de convite (com aprovação do dono). */
export function JoinGroup({ token }: { readonly token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await requestJoin(browserClient(), token);
      if (!res) {
        setError("Convite inválido ou expirado.");
        setBusy(false);
        return;
      }
      if (res.status === "member") {
        // já é membro — vai direto pro grupo
        router.push(`/grupos/${res.groupId}`);
        router.refresh();
        return;
      }
      setSent(res.name);
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao pedir entrada no grupo.");
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Convite</h1>
      {sent ? (
        <p style={{ color: "#2a7" }}>
          Pedido enviado para <strong>{sent}</strong>. Aguarde a aprovação do responsável pelo
          grupo.
        </p>
      ) : (
        <>
          <p>Você recebeu um convite para um grupo.</p>
          <button type="button" onClick={() => void ask()} disabled={busy} style={{ padding: 12 }}>
            {busy ? "Enviando…" : "Pedir para entrar"}
          </button>
        </>
      )}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
    </main>
  );
}
