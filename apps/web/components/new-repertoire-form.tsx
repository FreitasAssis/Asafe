"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REPERTOIRE_TYPES,
  REPERTOIRE_TYPE_LABELS,
  type RepertoireType,
} from "@asafe/core";
import { createRepertoireAction } from "@/app/(app)/repertorios/novo/actions";
import { Breadcrumb } from "@/components/breadcrumb";

export function NewRepertoireForm() {
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
      const { id } = await createRepertoireAction({
        title: title.trim(),
        type,
        date: date.trim() || null,
      });
      router.push(`/repertorios/${id}/editar`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto my-8 max-w-md px-4">
      <Breadcrumb items={[{ label: "Repertórios", href: "/repertorios" }, { label: "Novo" }]} />
      <h1 className="font-serif text-2xl font-semibold">Novo repertório</h1>
      <div className="mt-3 flex flex-col gap-2.5">
        <label className="text-[13px] text-muted">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RepertoireType)}
          className="input"
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
          className="input"
        />
        <label className="text-[13px] text-muted">Data (opcional)</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />

        {error && <p className="text-danger">{error}</p>}

        <button type="button" onClick={() => void create()} disabled={saving} className="btn btn-primary">
          {saving ? "Criando…" : "Criar e montar"}
        </button>
      </div>
    </main>
  );
}
