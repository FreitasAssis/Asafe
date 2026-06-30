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
  setItemNotes,
  setItemOrder,
  setItemTranspose,
  setRepertoireGroup,
  updateRepertoire,
  type Repertoire,
  type RepertoireItemFull,
  type SlotTemplate,
} from "@/lib/repertoires";
import type { ShareLink } from "@/lib/share-links";
import type { Group } from "@/lib/groups";
import { Breadcrumb } from "@/components/breadcrumb";
import { SongPicker } from "./song-picker";
import { ShareSection } from "./share-section";

export function RepertoireBuilder({
  repertoire,
  template,
  songs,
  tags,
  shareLinks,
  isOwner,
  groups,
}: {
  readonly repertoire: Repertoire;
  readonly template: SlotTemplate;
  readonly songs: SongListItem[];
  readonly tags: Tag[];
  readonly shareLinks: ShareLink[];
  readonly isOwner: boolean;
  readonly groups: Group[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(repertoire.title);
  const [date, setDate] = useState(repertoire.date ?? "");
  const [groupId, setGroupId] = useState(repertoire.groupId ?? "");
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

  async function changeTranspose(item: RepertoireItemFull, delta: number) {
    const transpose = item.transpose + delta;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, transpose } : i)));
    try {
      await setItemTranspose(browserClient(), item.id, transpose);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao transpor.");
    }
  }

  async function saveNotes(item: RepertoireItemFull, notes: string) {
    const value = notes.trim() || null;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, notes: value } : i)));
    try {
      await setItemNotes(browserClient(), item.id, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar nota.");
    }
  }

  /** Move um item para cima/baixo dentro do momento (troca o `order` com o vizinho). */
  async function move(item: RepertoireItemFull, slotItems: RepertoireItemFull[], dir: "up" | "down") {
    const idx = slotItems.findIndex((i) => i.id === item.id);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= slotItems.length) return;
    const neighbor = slotItems[target]!;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === item.id) return { ...i, order: neighbor.order };
        if (i.id === neighbor.id) return { ...i, order: item.order };
        return i;
      }),
    );
    try {
      const sb = browserClient();
      await Promise.all([
        setItemOrder(sb, item.id, neighbor.order),
        setItemOrder(sb, neighbor.id, item.order),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao reordenar.");
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

  async function changeGroup(value: string) {
    setGroupId(value);
    try {
      await setRepertoireGroup(browserClient(), repertoire.id, value || null);
      setSavedMsg(value ? "Compartilhado com o grupo ✓" : "Não compartilhado");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao compartilhar.");
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
            <li
              key={it.id}
              style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", flexWrap: "wrap" }}
            >
              <a href={`/musicas/${it.songId}`} style={{ minWidth: 120 }}>
                {it.songTitle}
              </a>
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12 }}>
                <button type="button" onClick={() => void changeTranspose(it, -1)}>
                  −
                </button>
                <span style={{ minWidth: 44, textAlign: "center" }}>
                  tom {it.transpose > 0 ? `+${it.transpose}` : it.transpose}
                </span>
                <button type="button" onClick={() => void changeTranspose(it, 1)}>
                  +
                </button>
              </span>
              <input
                defaultValue={it.notes ?? ""}
                placeholder="nota…"
                onBlur={(e) => void saveNotes(it, e.target.value)}
                style={{ fontSize: 12, padding: "2px 6px", width: 140 }}
              />
              <button type="button" onClick={() => void move(it, slotItems, "up")} style={{ fontSize: 12 }}>
                ↑
              </button>
              <button type="button" onClick={() => void move(it, slotItems, "down")} style={{ fontSize: 12 }}>
                ↓
              </button>
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
        <Breadcrumb
          items={[
            { label: "Repertórios", href: "/repertorios" },
            { label: title, href: `/repertorios/${repertoire.id}` },
            { label: "Editar" },
          ]}
        />
        {isOwner && (
          <button type="button" onClick={() => void destroy()} style={{ color: "#c00" }}>
            Excluir
          </button>
        )}
      </div>

      {isOwner ? (
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
      ) : (
        <h1 style={{ marginTop: 12 }}>
          {title}
          {date ? <span style={{ color: "#888", fontWeight: 400, fontSize: 16 }}> · {date}</span> : null}
        </h1>
      )}
      <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
        {repertoire.type}
        {!isOwner && " · compartilhado com você"}
      </div>

      {isOwner && (
        <div style={{ marginTop: 10, fontSize: 14 }}>
          <label>
            Compartilhar com grupo:{" "}
            <select value={groupId} onChange={(e) => void changeGroup(e.target.value)}>
              <option value="">— não compartilhado —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {isOwner && <ShareSection repertoireId={repertoire.id} initialLinks={shareLinks} />}

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
