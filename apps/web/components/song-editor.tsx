"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  audioProvider,
  isAllowedAudioUrl,
  MAX_AUDIO_LINKS,
} from "@asafe/core";
import {
  detectFormat,
  stripChords,
  toChordPro,
  transpose,
} from "@asafe/chordpro";
import { browserClient } from "@/lib/supabase/client";
import {
  createSong,
  deleteSong,
  updateSong,
  type Song,
} from "@/lib/songs";
import { ChordPreview } from "./chord-preview";

const FORMAT_LABEL: Record<string, string> = {
  chordpro: "ChordPro",
  "chords-over-lyrics": "acordes sobre a letra",
  "lyrics-only": "só letra",
};

export function SongEditor({ userId, song }: { userId: string; song?: Song }) {
  const router = useRouter();
  const editing = Boolean(song);

  const [title, setTitle] = useState(song?.title ?? "");
  const [composer, setComposer] = useState(song?.composer ?? "");
  const [defaultKey, setDefaultKey] = useState(song?.defaultKey ?? "");
  const [cifra, setCifra] = useState(song?.chordproBody ?? "");
  const [audioLinks, setAudioLinks] = useState<string[]>(song?.audioLinks ?? []);
  const [offset, setOffset] = useState(0);
  const [hideChords, setHideChords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const detected = cifra.trim() ? detectFormat(cifra) : null;

  // Cifra exibida no preview: normaliza → transpõe → (esconde acordes, só visual).
  const preview = useMemo(() => {
    if (!cifra.trim()) return "";
    try {
      const stored = transpose(toChordPro(cifra), offset);
      return hideChords ? stripChords(stored) : stored;
    } catch {
      return cifra;
    }
  }, [cifra, offset, hideChords]);

  function setLink(i: number, value: string) {
    setAudioLinks((links) => links.map((l, j) => (j === i ? value : l)));
  }
  function addLink() {
    setAudioLinks((links) => [...links, ""]);
  }
  function removeLink(i: number) {
    setAudioLinks((links) => links.filter((_, j) => j !== i));
  }

  async function save() {
    setError(null);
    setSavedMsg(null);
    if (!title.trim()) {
      setError("Dê um título para a música.");
      return;
    }
    const links = audioLinks.map((l) => l.trim()).filter(Boolean);
    const bad = links.find((l) => !isAllowedAudioUrl(l));
    if (bad) {
      setError(
        `Link não suportado: ${bad}. Aceitamos YouTube, Spotify, Deezer, SoundCloud e Apple Music.`,
      );
      return;
    }
    if (links.length > MAX_AUDIO_LINKS) {
      setError(`No máximo ${MAX_AUDIO_LINKS} links de áudio.`);
      return;
    }

    // O que você vê é o que salva: aplica o transpose corrente à cifra normalizada.
    const chordproBody = transpose(toChordPro(cifra), offset);
    const input = {
      title: title.trim(),
      composer: composer.trim() || null,
      defaultKey: defaultKey.trim() || null,
      chordproBody,
      audioLinks: links,
    };

    setSaving(true);
    try {
      const supabase = browserClient();
      if (editing && song) {
        await updateSong(supabase, song.id, input);
        // "Assa" o transpose no estado para manter o editor coerente com o salvo.
        setCifra(chordproBody);
        setOffset(0);
        setSavedMsg("Salvo ✓");
        router.refresh();
      } else {
        const created = await createSong(supabase, userId, input);
        router.push(`/musicas/${created.id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!song) return;
    if (!confirm("Excluir esta música?")) return;
    setSaving(true);
    try {
      await deleteSong(browserClient(), song.id);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "1.5rem auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{editing ? "Editar música" : "Nova música"}</h1>
        <a href="/">← voltar</a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <input
          placeholder="Título *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Compositor (opcional)"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            style={{ padding: 10, fontSize: 16, flex: 2 }}
          />
          <input
            placeholder="Tom (ex.: G)"
            value={defaultKey}
            onChange={(e) => setDefaultKey(e.target.value)}
            style={{ padding: 10, fontSize: 16, flex: 1 }}
          />
        </div>
      </div>

      {/* Editor + preview lado a lado */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div>
          <label style={{ fontSize: 13, color: "#666" }}>
            Cole a cifra{detected ? ` — formato: ${FORMAT_LABEL[detected]}` : ""}
          </label>
          <textarea
            value={cifra}
            onChange={(e) => setCifra(e.target.value)}
            placeholder={"Cole aqui a cifra (acordes sobre a letra, ChordPro ou só letra)."}
            rows={18}
            style={{ width: "100%", padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 14 }}
          />
        </div>

        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button type="button" onClick={() => setOffset((o) => o - 1)}>
              −
            </button>
            <span style={{ minWidth: 70, textAlign: "center", fontSize: 13 }}>
              tom {offset > 0 ? `+${offset}` : offset}
            </span>
            <button type="button" onClick={() => setOffset((o) => o + 1)}>
              +
            </button>
            <label style={{ marginLeft: 12, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={hideChords}
                onChange={(e) => setHideChords(e.target.checked)}
              />{" "}
              esconder cifra
            </label>
          </div>
          <ChordPreview chordpro={preview} />
        </div>
      </div>

      {/* Links de áudio */}
      <section style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, color: "#666" }}>
          Links de áudio (até {MAX_AUDIO_LINKS}) — YouTube, Spotify, Deezer, SoundCloud, Apple Music
        </label>
        {audioLinks.map((link, i) => {
          const provider = link.trim() ? audioProvider(link.trim()) : null;
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(i, e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <span style={{ fontSize: 12, width: 90, color: provider ? "#2a7" : "#c00" }}>
                {link.trim() ? (provider ?? "não suportado") : ""}
              </span>
              <button type="button" onClick={() => removeLink(i)}>
                remover
              </button>
            </div>
          );
        })}
        {audioLinks.length < MAX_AUDIO_LINKS && (
          <button type="button" onClick={addLink} style={{ marginTop: 6 }}>
            + adicionar link
          </button>
        )}
      </section>

      {error && <p style={{ color: "#c00" }}>{error}</p>}
      {savedMsg && <p style={{ color: "#2a7" }}>{savedMsg}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" onClick={() => void save()} disabled={saving} style={{ padding: "10px 18px" }}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={saving}
            style={{ padding: "10px 18px", color: "#c00" }}
          >
            Excluir
          </button>
        )}
      </div>
    </main>
  );
}
