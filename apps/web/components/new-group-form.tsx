"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { createGroup } from "@/lib/groups";

export function NewGroupForm({ userId }: { readonly userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) {
      setError("Dê um nome ao grupo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const group = await createGroup(browserClient(), userId, name.trim());
      router.push(`/grupos/${group.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar.");
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong>Novo grupo</strong>
        <input
          placeholder="Nome do grupo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, fontSize: 15, flex: 1 }}
        />
        <button type="button" onClick={() => void create()} disabled={saving} style={{ padding: 8 }}>
          {saving ? "Criando…" : "Criar grupo"}
        </button>
      </div>
      {error && <p style={{ color: "#c00", margin: "8px 0 0" }}>{error}</p>}
    </section>
  );
}
