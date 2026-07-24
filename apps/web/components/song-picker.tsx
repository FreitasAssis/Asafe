"use client";

import { useEffect, useMemo, useState } from "react";
import {
  filterSongs,
  momentTagNameForSlot,
  rankMomentSuggestions,
  TAG_CATEGORY_COLORS,
  type SuggestionCandidate,
  type SuggestionReason,
  type TagCategory,
} from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { momentSongUsage, type MomentUsage } from "@/lib/liturgy/suggestions";
import type { SongListItem, Tag } from "@/lib/songs";
import { FreshnessTag } from "./freshness-tag";

/** Contexto litúrgico para as sugestões por momento (A5). */
export interface SuggestionContext {
  linkedSongIds: Set<string>;
  momentLabel: string;
  /** Chave do slot (moment_slot), para o sinal de uso; null no "Livre". */
  momentKey: string | null;
  seasonLabel: string | null;
  liturgicalKey: string | null;
}

const REASON_LABEL: Record<SuggestionReason, string> = {
  leitura: "combina com a leitura",
  momento: "do momento",
  tempo: "do tempo",
  usada: "costuma aparecer aqui",
  fresca: "nunca cantada",
};

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
  suggestion,
}: {
  readonly songs: SongListItem[];
  readonly tags: Tag[];
  readonly onPick: (songId: string) => void;
  readonly onClose: () => void;
  /** A5: sugere músicas do catálogo para o momento (leitura + tag + frescor). */
  readonly suggestion?: SuggestionContext;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [usage, setUsage] = useState<Map<string, MomentUsage>>(new Map());
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  // Sinal de uso (A5 v2): quantas vezes cada música aparece neste momento nos
  // repertórios que vejo. Busca ao abrir; o ranqueamento reordena quando chega.
  const momentKey = suggestion?.momentKey ?? null;
  const liturgicalKey = suggestion?.liturgicalKey ?? null;
  useEffect(() => {
    if (!momentKey) return;
    let alive = true;
    void momentSongUsage(browserClient(), momentKey, liturgicalKey)
      .then((u) => alive && setUsage(u))
      .catch(() => alive && setUsage(new Map()));
    return () => {
      alive = false;
    };
  }, [momentKey, liturgicalKey]);

  // Sugeridas para o momento: cruza os sinais (ligada à leitura / tag do momento /
  // do tempo / uso / frescor) e ranqueia no core. Só quando há contexto litúrgico.
  const suggested = useMemo(() => {
    if (!suggestion) return [];
    const { linkedSongIds, momentLabel, momentKey: mKey, seasonLabel } = suggestion;
    // O nome da tag de momento pode divergir do label do slot (ex.: slot "Salmo
    // Responsorial" → tag "Salmo"). Casar pelo label cru excluiria a música do momento.
    const momentTagName = momentTagNameForSlot(mKey, momentLabel);
    const candidates: SuggestionCandidate[] = songs.map((s) => {
      let momentMatch = false;
      let seasonMatch = false;
      let otherMoment = false; // tem tag de OUTRO momento (tem lar em outro lugar)
      for (const id of s.tagIds) {
        const t = tagById.get(id);
        if (!t) continue;
        if (t.category === "momento") {
          if (t.name === momentTagName) momentMatch = true;
          else otherMoment = true;
        }
        if (t.category === "tempo_liturgico" && seasonLabel && t.name === seasonLabel) seasonMatch = true;
      }
      const u = usage.get(s.id);
      return {
        id: s.id,
        linkedToReading: linkedSongIds.has(s.id),
        momentMatch,
        matchesOtherMoment: otherMoment,
        seasonMatch,
        momentUsage: u?.nMoment ?? 0,
        anchorUsage: u?.nAnchor ?? 0,
        lastUsed: s.lastUsed ? new Date(s.lastUsed) : null,
      };
    });
    const byId = new Map(songs.map((s) => [s.id, s]));
    return rankMomentSuggestions(candidates, new Date())
      .map((r) => ({ song: byId.get(r.id)!, reasons: r.reasons }))
      .filter((x) => x.song);
  }, [suggestion, songs, tagById, usage]);

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
        background: "var(--surface)",
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

      {suggested.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
            Sugeridas para {suggestion!.momentLabel}
          </div>
          <div className="song-cards">
            {suggested.map(({ song: s, reasons }) => (
              <button key={s.id} type="button" className="song-card" onClick={() => onPick(s.id)}>
                <span className="song-card-title">
                  {s.title} <FreshnessTag lastUsed={s.lastUsed} />
                </span>
                {s.composer && <span className="song-card-sub">{s.composer}</span>}
                <span style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                  {reasons.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 10,
                        padding: "0 6px",
                        borderRadius: 999,
                        background: "var(--border)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {REASON_LABEL[r]}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 2px" }}>
            Todo o catálogo
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: "10px 0 0" }}>Nenhuma música encontrada.</p>
      ) : (
        <div className="song-cards">
          {filtered.map((s) => (
            <button key={s.id} type="button" className="song-card" onClick={() => onPick(s.id)}>
              <span className="song-card-title">
                {s.title} <FreshnessTag lastUsed={s.lastUsed} />
              </span>
              {s.composer && <span className="song-card-sub">{s.composer}</span>}
              <span className={`song-card-snippet${s.snippet ? "" : " is-ref"}`}>
                {s.snippet || "— referência (sem cifra)"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
