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
    <section className="card mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong>Novo grupo</strong>
        <input
          placeholder="Nome do grupo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
        />
        <button type="button" onClick={() => void create()} disabled={saving} className="btn btn-primary">
          {saving ? "Criando…" : "Criar grupo"}
        </button>
      </div>
      {error && <p className="mt-2 text-danger">{error}</p>}
    </section>
  );
}
