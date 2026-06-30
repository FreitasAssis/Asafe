"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REPERTOIRE_TYPES,
  REPERTOIRE_TYPE_LABELS,
  type RepertoireType,
} from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { createRepertoire } from "@/lib/repertoires";
import { Breadcrumb } from "@/components/breadcrumb";

export function NewRepertoireForm({ userId }: { readonly userId: string }) {
  const router = useRouter();
  const [type, setType] = useState<RepertoireType>("Missa");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim()) {
      setError("Dê um título ao repertório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { id } = await createRepertoire(browserClient(), userId, {
        title: title.trim(),
        type,
        date: date.trim() || null,
      });
      router.push(`/repertorios/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar.");
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "2rem auto", padding: "0 1rem" }}>
      <Breadcrumb items={[{ label: "Repertórios", href: "/repertorios" }, { label: "Novo" }]} />
      <h1>Novo repertório</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, color: "#666" }}>Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RepertoireType)}
          style={{ padding: 10, fontSize: 16 }}
        >
          {REPERTOIRE_TYPES.map((t) => (
            <option key={t} value={t}>
              {REPERTOIRE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <input
          placeholder="Título (ex.: Missa de domingo)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <label style={{ fontSize: 13, color: "#666" }}>Data (opcional)</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 10 }} />

        {error && <p style={{ color: "#c00" }}>{error}</p>}

        <button type="button" onClick={() => void create()} disabled={saving} style={{ padding: 12 }}>
          {saving ? "Criando…" : "Criar e montar"}
        </button>
      </div>
    </main>
  );
}
