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
import { StatusBadge } from "@/components/status-badge";
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
  initialTab = "meus",
}: {
  readonly songs: SongListItem[];
  readonly tags: Tag[];
  readonly userId: string;
  readonly initialTab?: "meus" | "comunidade";
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"meus" | "comunidade">(initialTab);

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

  // Meus = minhas músicas; Comunidade = o resto do que posso usar (catálogo global + aprovadas).
  const visible = useMemo(
    () => filtered.filter((s) => (tab === "meus" ? s.ownerId === userId : s.ownerId !== userId)),
    [filtered, tab, userId],
  );

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
      <div className="flex items-center justify-between">
        <h1 style={{ marginTop: 0 }}>Catálogo</h1>
        <a href="/musicas/importar" className="text-sm">
          Importar em lote
        </a>
      </div>
      <div className="mt-3 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("meus")}
          className={tab === "meus" ? "border-b-2 border-primary px-3 py-2 font-semibold text-ink" : "px-3 py-2 text-muted"}
        >
          Meus
        </button>
        <button
          type="button"
          onClick={() => setTab("comunidade")}
          className={tab === "comunidade" ? "border-b-2 border-primary px-3 py-2 font-semibold text-ink" : "px-3 py-2 text-muted"}
        >
          Comunidade
        </button>
      </div>
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

      {visible.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          {tab === "comunidade"
            ? "Nenhuma música da comunidade ainda."
            : songs.length === 0
              ? "Você ainda não tem músicas. Crie a primeira!"
              : "Nenhuma música com esse filtro."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {visible.map((s) => (
            <li
              key={s.id}
              style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <a
                    href={tab === "comunidade" ? `/musicas/${s.id}?from=comunidade` : `/musicas/${s.id}`}
                    style={{ fontSize: 17, fontWeight: 600 }}
                  >
                    {s.title}
                  </a>
                  {s.composer && <span style={{ color: "var(--text-muted)" }}> — {s.composer}</span>}{" "}
                  <FreshnessTag lastUsed={s.lastUsed} />
                  {s.ownerId === userId && (
                    <>
                      {" "}
                      <StatusBadge status={s.communityStatus} />
                    </>
                  )}
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
