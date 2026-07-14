"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  arrangeRepertoire,
  audioProvider,
  REPERTOIRE_TYPE_LABELS,
  type RepertoireType,
  type SlotDef,
} from "@asafe/core";
import { stripChords, toHtml, transpose } from "@asafe/chordpro";
import { readPrefs, writePrefs } from "@/lib/preferences";

export interface PublicItem {
  id: string;
  momentSlot: string | null;
  order: number;
  transpose: number;
  notes: string | null;
  title: string;
  chordpro: string | null;
  // Metadado da música (opcional: o pacote via link público pode não trazer).
  composer?: string | null;
  audioLinks?: string[];
}

export interface SharedPackage {
  repertoire: { title: string; type: RepertoireType; date: string | null };
  slots: SlotDef[];
  items: PublicItem[];
}

function ItemView({ item, hide }: { item: PublicItem; hide: boolean }) {
  let cifra = item.chordpro ?? "";
  const isReference = !cifra.trim();
  if (cifra.trim() && item.transpose) cifra = transpose(cifra, item.transpose);
  if (hide) cifra = stripChords(cifra);
  const html = cifra.trim() ? toHtml(cifra) : "";

  return (
    <div style={{ margin: "10px 0 16px" }}>
      <div style={{ fontWeight: 600 }}>
        {item.title}
        {item.transpose ? (
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 13 }}>
            {" "}
            (tom {item.transpose > 0 ? `+${item.transpose}` : item.transpose})
          </span>
        ) : null}
      </div>
      {/* Atribuição (direito moral, §5/§10): o autor aparece sempre que a obra é exibida. */}
      {item.composer && (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{item.composer}</div>
      )}
      {item.notes && (
        <div style={{ color: "#a60", fontSize: 13, fontStyle: "italic" }}>{item.notes}</div>
      )}
      {html && (
        <div
          className="chord-preview"
          style={{ marginTop: 4 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {isReference && (
        <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 13 }}>
          <div style={{ fontStyle: "italic" }}>— cifra não disponível (referência)</div>
          {item.audioLinks && item.audioLinks.length > 0 && (
            <div style={{ marginTop: 2 }}>
              Ouça:{" "}
              {item.audioLinks.map((url, i) => (
                <span key={url}>
                  {i > 0 ? " · " : ""}
                  <a href={url} target="_blank" rel="noreferrer">
                    {audioProvider(url) ?? "link"} ↗
                  </a>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Página pública de leitura de um repertório (só leitura, sem login). */
export function PublicRepertoire({
  pkg,
  header,
}: {
  readonly pkg: SharedPackage;
  /** Conteúdo opcional no topo (breadcrumb + lápis na visualização in-app). */
  readonly header?: ReactNode;
}) {
  const [hide, setHide] = useState(false);
  useEffect(() => setHide(Boolean(readPrefs().hideChords)), []);
  const arranged = arrangeRepertoire(pkg.slots, pkg.items);
  const slotsWithItems = arranged.slots.filter((s) => s.items.length > 0);

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      {header}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>{pkg.repertoire.title}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {REPERTOIRE_TYPE_LABELS[pkg.repertoire.type]}
            {pkg.repertoire.date ? ` · ${pkg.repertoire.date}` : ""}
          </div>
        </div>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={hide}
            onChange={(e) => {
              setHide(e.target.checked);
              writePrefs({ hideChords: e.target.checked });
            }}
          />{" "}
          esconder cifra
        </label>
      </div>

      {slotsWithItems.length === 0 && arranged.unslotted.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Este repertório ainda não tem músicas.</p>
      )}

      {slotsWithItems.map((s) => (
        <section key={s.key} style={{ marginTop: 34 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--primary)",
              borderBottom: "2px solid var(--border)",
              paddingBottom: 6,
              marginBottom: 12,
            }}
          >
            {s.label}
          </h2>
          {s.items.map((it) => (
            <ItemView key={it.id} item={it} hide={hide} />
          ))}
        </section>
      ))}

      {arranged.unslotted.length > 0 && (
        <section style={{ marginTop: 16 }}>
          {arranged.unslotted.map((it) => (
            <ItemView key={it.id} item={it} hide={hide} />
          ))}
        </section>
      )}

      <footer style={{ marginTop: 32, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
        Asafe 🎵
      </footer>
    </main>
  );
}
