"use client";

import { useEffect, useState } from "react";
import type { SongListItem, Tag } from "@/lib/songs";
import {
  catalogForPicker,
  linkSongToReading,
  songsForReading,
  unlinkSong,
  type LinkedSong,
} from "@/lib/liturgy/pericope-actions";
import { SongPicker } from "./song-picker";

/**
 * Músicas ligadas a UMA leitura (A4): lista o que já foi vinculado — casando por
 * SOBREPOSIÇÃO, então um vínculo feito em "Lc 15,11-32" aparece quando o dia vem
 * "Lc 15,1-3.11-32" — e permite vincular uma música do seu catálogo.
 *
 * O vínculo é global (todos veem) e publica a REFERÊNCIA da música; a cifra
 * segue as regras de sempre. O aviso disso é um agradecimento, não um alerta.
 */
export function ReadingLinks({
  readingRef,
  moments,
}: {
  readonly readingRef: string;
  /** Momentos da celebração p/ sugerir (só onde há template — ex.: construtor). */
  readonly moments?: readonly { key: string; label: string }[];
}) {
  const [links, setLinks] = useState<LinkedSong[] | null>(null);
  const [catalog, setCatalog] = useState<{ songs: SongListItem[]; tags: Tag[] } | null>(null);
  const [picking, setPicking] = useState(false);
  const [moment, setMoment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void songsForReading(readingRef)
      .then((r) => alive && setLinks(r))
      .catch(() => alive && setLinks([]));
    return () => {
      alive = false;
    };
  }, [readingRef]);

  async function openPicker() {
    setError(null);
    if (!catalog) {
      try {
        setCatalog(await catalogForPicker());
      } catch {
        setError("Não consegui carregar seu catálogo.");
        return;
      }
    }
    setPicking(true);
  }

  async function pick(songId: string) {
    setBusy(true);
    setError(null);
    try {
      await linkSongToReading(readingRef, songId, moment || null);
      setLinks(await songsForReading(readingRef));
      setPicking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao vincular.");
    }
    setBusy(false);
  }

  async function remove(linkId: string) {
    setBusy(true);
    try {
      await unlinkSong(linkId);
      setLinks((cur) => (cur ?? []).filter((l) => l.linkId !== linkId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 6 }}>
      {links && links.length > 0 && (
        <ul style={{ listStyle: "none", margin: "0 0 4px", padding: 0, fontSize: 13 }}>
          {links.map((l) => (
            <li key={l.linkId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}>
              <span aria-hidden>🎵</span>
              <a href={`/musicas/${l.songId}`}>{l.title}</a>
              {l.composer && <span style={{ color: "var(--text-muted)" }}>· {l.composer}</span>}
              {l.suggestedMoment && (
                <span style={{ color: "var(--text-muted)" }}>· {l.suggestedMoment}</span>
              )}
              {l.mine && (
                <button
                  type="button"
                  onClick={() => void remove(l.linkId)}
                  disabled={busy}
                  style={{ fontSize: 12, color: "var(--text-muted)" }}
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {picking ? (
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>
            🎵 <strong>Obrigado por contribuir!</strong> Ao vincular, o título e o autor desta música
            passam a aparecer para a comunidade — assim outras equipes descobrem sugestões para esta
            leitura. A cifra continua seguindo as suas regras de acesso.
          </p>
          {moments && moments.length > 0 && (
            <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Momento sugerido (opcional){" "}
              <select value={moment} onChange={(e) => setMoment(e.target.value)}>
                <option value="">—</option>
                {moments.map((m) => (
                  <option key={m.key} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {catalog && (
            <SongPicker
              songs={catalog.songs}
              tags={catalog.tags}
              onPick={(id) => void pick(id)}
              onClose={() => setPicking(false)}
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void openPicker()}
          disabled={busy}
          style={{ fontSize: 12, color: "var(--primary)" }}
        >
          + vincular música
        </button>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}
