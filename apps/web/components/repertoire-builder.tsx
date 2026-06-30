"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { arrangeRepertoire } from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import type { SongListItem, Tag } from "@/lib/songs";
import {
  addItem,
  deleteRepertoire,
  removeItem,
  updateRepertoire,
  type Repertoire,
  type RepertoireItemFull,
  type SlotTemplate,
} from "@/lib/repertoires";
import { SongPicker } from "./song-picker";

export function RepertoireBuilder({
  repertoire,
  template,
  songs,
  tags,
}: {
  readonly repertoire: Repertoire;
  readonly template: SlotTemplate;
  readonly songs: SongListItem[];
  readonly tags: Tag[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(repertoire.title);
  const [date, setDate] = useState(repertoire.date ?? "");
  const [items, setItems] = useState<RepertoireItemFull[]>(repertoire.items);
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const arranged = useMemo(
    () => arrangeRepertoire(template.slots, items),
    [template.slots, items],
  );
  const isSarau = template.slots.length === 0;

  function openPicker(slot: string | null) {
    setPickerSlot(slot);
    setPickerOpen(true);
    setError(null);
  }

  async function pick(songId: string) {
    const order = items.filter((i) => i.momentSlot === pickerSlot).length;
    try {
      const created = await addItem(browserClient(), repertoire.id, songId, pickerSlot, order);
      setItems((prev) => [...prev, created]);
      setPickerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar.");
    }
  }

  async function remove(itemId: string) {
    try {
      await removeItem(browserClient(), itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  async function saveMeta() {
    setSavedMsg(null);
    try {
      await updateRepertoire(browserClient(), repertoire.id, {
        title: title.trim() || "Sem título",
        date: date.trim() || null,
      });
      setSavedMsg("Salvo ✓");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    }
  }

  async function destroy() {
    if (!confirm("Excluir este repertório?")) return;
    try {
      await deleteRepertoire(browserClient(), repertoire.id);
      router.push("/repertorios");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  function SlotSection({
    slotKey,
    label,
    optional,
    slotItems,
  }: {
    slotKey: string | null;
    label: string;
    optional?: boolean;
    slotItems: RepertoireItemFull[];
  }) {
    const open = pickerOpen && pickerSlot === slotKey;
    return (
      <section style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 600 }}>
          {label}
          {optional && <span style={{ color: "#aaa", fontWeight: 400 }}> (opcional)</span>}
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "4px 0" }}>
          {slotItems.map((it) => (
            <li key={it.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "2px 0" }}>
              <a href={`/musicas/${it.songId}`}>{it.songTitle}</a>
              <button type="button" onClick={() => void remove(it.id)} style={{ fontSize: 12 }}>
                remover
              </button>
            </li>
          ))}
        </ul>
        {open ? (
          <SongPicker songs={songs} tags={tags} onPick={(id) => void pick(id)} onClose={() => setPickerOpen(false)} />
        ) : (
          <button type="button" onClick={() => openPicker(slotKey)} style={{ fontSize: 13 }}>
            + adicionar música
          </button>
        )}
      </section>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/repertorios">← repertórios</a>
        <button type="button" onClick={() => void destroy()} style={{ color: "#c00" }}>
          Excluir
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, padding: 10, fontSize: 18, fontWeight: 600 }}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8 }} />
        <button type="button" onClick={() => void saveMeta()}>
          Salvar
        </button>
      </div>
      <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>{repertoire.type}</div>

      {error && <p style={{ color: "#c00" }}>{error}</p>}
      {savedMsg && <p style={{ color: "#2a7" }}>{savedMsg}</p>}

      {isSarau ? (
        <SlotSection slotKey={null} label="Músicas" slotItems={arranged.unslotted} />
      ) : (
        arranged.slots.map((s) => (
          <SlotSection
            key={s.key}
            slotKey={s.key}
            label={s.label}
            optional={s.optional}
            slotItems={s.items}
          />
        ))
      )}
    </main>
  );
}
