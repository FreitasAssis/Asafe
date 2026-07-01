"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseSongImport } from "@asafe/core";
import { toChordPro } from "@asafe/chordpro";
import { browserClient } from "@/lib/supabase/client";
import { importSongs, type Tag } from "@/lib/songs";
import { ChordPreview } from "./chord-preview";

interface Item {
  title: string;
  body: string;
  chordpro: string;
  tagIds: string[];
  excluded: boolean;
}

const EXAMPLE = `ENTRADA
Vem, Senhor Jesus
[C]Vem, [G]Senhor, não tardeis
---
ACLAMAÇÃO
Aleluia
Ale[D]luia, ale[A]luia`;

export function ImportSongs({ userId, tags }: { readonly userId: string; readonly tags: Tag[] }) {
  const router = useRouter();
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function analyze() {
    const parsed = parseSongImport(raw, tags);
    setItems(
      parsed.map((p) => ({
        title: p.title,
        body: p.body,
        chordpro: p.body.trim() ? toChordPro(p.body) : "",
        tagIds: p.tagIds,
        excluded: false,
      })),
    );
  }

  function patch(i: number, up: Partial<Item>) {
    setItems((prev) => prev!.map((it, idx) => (idx === i ? { ...it, ...up } : it)));
  }

  const toImport = (items ?? []).filter((it) => !it.excluded && it.title.trim() && it.body.trim());

  async function doImport() {
    setProgress({ done: 0, total: toImport.length });
    try {
      await importSongs(
        browserClient(),
        userId,
        toImport.map((it) => ({ title: it.title.trim(), chordproBody: it.chordpro, tagIds: it.tagIds })),
        (done) => setProgress({ done, total: toImport.length }),
      );
      router.push("/musicas");
      router.refresh();
    } catch {
      setProgress(null);
    }
  }

  return (
    <main className="mx-auto my-8 max-w-2xl px-4">
      <h1 className="mt-0 font-serif text-3xl font-semibold">Importar músicas</h1>
      <p className="mt-2 text-muted">
        Cole várias de uma vez. Separe cada música por uma linha só com <code>---</code>. O momento
        (ex.: Entrada, Aclamação) pode vir numa linha própria acima do título — viram tags.
      </p>

      {items === null ? (
        <>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={EXAMPLE}
            rows={14}
            className="input mt-3 font-mono text-sm"
          />
          <div className="mt-3">
            <button type="button" className="btn btn-primary" disabled={!raw.trim()} onClick={analyze}>
              Analisar
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-muted">
              {items.length} detectada(s) · {toImport.length} pronta(s) para importar
            </span>
            <button type="button" className="text-sm" onClick={() => setItems(null)}>
              ← editar texto
            </button>
          </div>

          <ul className="mt-2 list-none p-0">
            {items.map((it, i) => {
              const invalid = !it.title.trim() || !it.body.trim();
              return (
                <li key={i} className={`card mt-3 ${it.excluded ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <input
                      value={it.title}
                      onChange={(e) => patch(i, { title: e.target.value })}
                      placeholder="Título"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => patch(i, { excluded: !it.excluded })}
                    >
                      {it.excluded ? "incluir" : "remover"}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {it.tagIds.map((id) => (
                      <span key={id} className="chip">
                        {tagById.get(id)?.name ?? "?"}
                        <button
                          type="button"
                          aria-label="Tirar tag"
                          onClick={() => patch(i, { tagIds: it.tagIds.filter((t) => t !== id) })}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) patch(i, { tagIds: [...it.tagIds, e.target.value] });
                      }}
                      className="text-sm text-muted"
                    >
                      <option value="">+ tag</option>
                      {tags
                        .filter((t) => !it.tagIds.includes(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {invalid && !it.excluded && (
                    <p className="mt-2 text-sm text-danger">
                      {!it.title.trim() ? "Sem título. " : ""}
                      {!it.body.trim() ? "Sem cifra." : ""} Não será importada.
                    </p>
                  )}

                  {it.chordpro && (
                    <div className="mt-2 border-t border-border pt-2">
                      <ChordPreview chordpro={it.chordpro} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4">
            {progress ? (
              <span className="text-muted">
                Importando {progress.done}/{progress.total}…
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={toImport.length === 0}
                onClick={() => void doImport()}
              >
                Importar {toImport.length} música(s)
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
