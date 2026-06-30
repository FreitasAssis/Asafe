"use client";

import { useMemo, useState } from "react";
import {
  filterSongs,
  TAG_CATEGORY_COLORS,
  TAG_CATEGORY_LABELS,
  type TagCategory,
} from "@asafe/core";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { deleteSong, type SongListItem, type Tag } from "@/lib/songs";
import { Fab } from "@/components/fab";
import { RowActions } from "@/components/row-actions";
import { FreshnessTag } from "./freshness-tag";

const CATEGORIES: TagCategory[] = [
  "momento",
  "tempo_liturgico",
  "tema",
  "ocasiao",
  "salmo",
  "fonte",
];

function Chip({ tag, on, onClick }: { tag: Tag; on?: boolean; onClick?: () => void }) {
  const color = TAG_CATEGORY_COLORS[tag.category];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "2px 9px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: on ? color : "transparent",
        color: on ? "#fff" : color,
        fontSize: 12,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {tag.name}
    </button>
  );
}

export function Catalog({
  songs,
  tags,
  userId,
}: {
  readonly songs: SongListItem[];
  readonly tags: Tag[];
  readonly userId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  // Só mostramos no filtro as tags que aparecem em alguma música (filtro relevante).
  const usedTags = useMemo(() => {
    const used = new Set<string>();
    for (const s of songs) for (const id of s.tagIds) used.add(id);
    return tags.filter((t) => used.has(t.id));
  }, [songs, tags]);

  // Seleção agrupada por categoria → grupos para o filterSongs (E entre / OU dentro).
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
    if (q) {
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.composer ?? "").toLowerCase().includes(q),
      );
    }
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
    <main style={{ maxWidth: 760, margin: "1.5rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginTop: 0 }}>Meu catálogo</h1>
      <Fab href="/musicas/nova" label="Nova música" />

      <input
        placeholder="Buscar por título ou compositor…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 10, fontSize: 16, margin: "12px 0" }}
      />

      {/* Filtro por tags (só as usadas) */}
      {usedTags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {CATEGORIES.map((cat) => {
            const catTags = usedTags.filter((t) => t.category === cat);
            if (catTags.length === 0) return null;
            return (
              <div key={cat} style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, color: TAG_CATEGORY_COLORS[cat] }}>
                  {TAG_CATEGORY_LABELS[cat]}:{" "}
                </span>
                <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                  {catTags.map((t) => (
                    <Chip key={t.id} tag={t} on={selected.has(t.id)} onClick={() => toggle(t.id)} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ color: "#888" }}>
          {songs.length === 0
            ? "Você ainda não tem músicas. Crie a primeira!"
            : "Nenhuma música com esse filtro."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filtered.map((s) => (
            <li
              key={s.id}
              style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <a href={`/musicas/${s.id}`} style={{ fontSize: 17, fontWeight: 600 }}>
                    {s.title}
                  </a>
                  {s.composer && <span style={{ color: "#888" }}> — {s.composer}</span>}{" "}
                  <FreshnessTag lastUsed={s.lastUsed} />
                </div>
                {s.ownerId === userId && (
                  <RowActions
                    editHref={`/musicas/${s.id}/editar`}
                    confirmText={`Excluir "${s.title}"?`}
                    onDelete={async () => {
                      await deleteSong(browserClient(), s.id);
                      router.refresh();
                    }}
                  />
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {s.tagIds
                  .map((id) => tagById.get(id))
                  .filter((t): t is Tag => Boolean(t))
                  .map((t) => (
                    <Chip key={t.id} tag={t} />
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
