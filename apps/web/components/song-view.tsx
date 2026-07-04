"use client";

import { useEffect, useState } from "react";
import { audioProvider, referenceExplanation } from "@asafe/core";
import { stripChords } from "@asafe/chordpro";
import type { Song, Tag } from "@/lib/songs";
import { readPrefs, writePrefs } from "@/lib/preferences";
import { Breadcrumb } from "@/components/breadcrumb";
import { EditPencil } from "@/components/edit-pencil";
import { ChordPreview } from "./chord-preview";

/** Visualização (só-leitura) de uma música. Lápis aparece só para quem pode editar. */
export function SongView({
  song,
  tags,
  canEdit,
}: {
  readonly song: Song;
  readonly tags: Tag[];
  readonly canEdit: boolean;
}) {
  const [hide, setHide] = useState(false);
  useEffect(() => setHide(Boolean(readPrefs().hideChords)), []);
  function toggleHide(v: boolean) {
    setHide(v);
    writePrefs({ hideChords: v });
  }
  const tagById = new Map(tags.map((t) => [t.id, t]));
  // Sem corpo pode ser: música própria vazia, ou referência da comunidade (a RLS de
  // song_content não liberou a cifra protegida a quem não é dono/grupo).
  const hasBody = song.chordproBody.trim().length > 0;
  const body = hide ? stripChords(song.chordproBody) : song.chordproBody;

  return (
    <main style={{ maxWidth: 760, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <Breadcrumb items={[{ label: "Catálogo", href: "/musicas" }, { label: song.title }]} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{song.title}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {song.composer ? song.composer : "sem compositor"}
            {song.defaultKey ? ` · tom ${song.defaultKey}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={hide} onChange={(e) => toggleHide(e.target.checked)} /> esconder
            cifra
          </label>
          {canEdit && <EditPencil href={`/musicas/${song.id}/editar`} />}
        </div>
      </div>

      {song.tagIds.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {song.tagIds
            .map((id) => tagById.get(id))
            .filter((t): t is Tag => Boolean(t))
            .map((t) => (
              <span
                key={t.id}
                style={{ fontSize: 12, background: "#eef", color: "#334", padding: "2px 8px", borderRadius: 999 }}
              >
                {t.name}
              </span>
            ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {hasBody ? (
          <ChordPreview chordpro={body} />
        ) : (
          <p
            style={{
              color: "var(--text-muted)",
              fontStyle: "italic",
              padding: "1rem",
              border: "1px dashed var(--border)",
              borderRadius: 8,
            }}
          >
            {canEdit
              ? "Esta música ainda não tem cifra — use o lápis para adicionar."
              : referenceExplanation(song.copyrightStatus)}
          </p>
        )}
      </div>

      {song.audioLinks.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 15 }}>Áudios</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {song.audioLinks.map((url) => (
              <li key={url} style={{ padding: "3px 0" }}>
                <a href={url} target="_blank" rel="noreferrer">
                  {audioProvider(url) ?? "link"} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
