"use client";

import { useMemo, useState } from "react";
import { filterSongs, TAG_CATEGORY_COLORS, type TagCategory } from "@asafe/core";
import type { SongListItem, Tag } from "@/lib/songs";
import { FreshnessTag } from "./freshness-tag";

const CATEGORIES: TagCategory[] = [
  "momento",
  "tempo_liturgico",
  "tema",
  "ocasiao",
  "salmo",
  "fonte",
];

/**
 * Seletor de música do catálogo (busca + filtro por tags). Emite `onPick(songId)`.
 * Usado ao montar repertório para preencher um momento.
 */
export function SongPicker({
  songs,
  tags,
  onPick,
  onClose,
}: {
  readonly songs: SongListItem[];
  readonly tags: Tag[];
  readonly onPick: (songId: string) => void;
  readonly onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const usedTags = useMemo(() => {
    const used = new Set<string>();
    for (const s of songs) for (const id of s.tagIds) used.add(id);
    return tags.filter((t) => used.has(t.id));
  }, [songs, tags]);

  const groups = useMemo(() => {
    const byCat = new Map<TagCategory, string[]>();
    for (const id of selected) {
      const t = tagById.get(id);
      if (!t) continue;
      byCat.set(t.category, [...(byCat.get(t.category) ?? []), id]);
    }
    return [...byCat.values()];
  }, [selected, tagById]);

  const filtered = useMemo(() => {
    let result = filterSongs(songs, groups);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((s) => s.title.toLowerCase().includes(q));
    return result;
  }, [songs, groups, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        background: "#fafafa",
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <input
          autoFocus
          placeholder="Buscar música…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="button" onClick={onClose}>
          fechar
        </button>
      </div>

      {usedTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {CATEGORIES.flatMap((cat) =>
            usedTags
              .filter((t) => t.category === cat)
              .map((t) => {
                const color = TAG_CATEGORY_COLORS[cat];
                const on = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    style={{
                      padding: "1px 8px",
                      borderRadius: 999,
                      border: `1px solid ${color}`,
                      background: on ? color : "transparent",
                      color: on ? "#fff" : color,
                      fontSize: 11,
                    }}
                  >
                    {t.name}
                  </button>
                );
              }),
          )}
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", maxHeight: 220, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <li style={{ color: "#888" }}>Nenhuma música encontrada.</li>
        ) : (
          filtered.map((s) => (
            <li key={s.id} style={{ padding: "4px 0" }}>
              <button
                type="button"
                onClick={() => onPick(s.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                + {s.title} <FreshnessTag lastUsed={s.lastUsed} />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
