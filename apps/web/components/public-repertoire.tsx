"use client";

import { useState, type ReactNode } from "react";
import {
  arrangeRepertoire,
  REPERTOIRE_TYPE_LABELS,
  type RepertoireType,
  type SlotDef,
} from "@asafe/core";
import { stripChords, toHtml, transpose } from "@asafe/chordpro";

export interface PublicItem {
  id: string;
  momentSlot: string | null;
  order: number;
  transpose: number;
  notes: string | null;
  title: string;
  chordpro: string | null;
}

export interface SharedPackage {
  repertoire: { title: string; type: RepertoireType; date: string | null };
  slots: SlotDef[];
  items: PublicItem[];
}

function ItemView({ item, hide }: { item: PublicItem; hide: boolean }) {
  let cifra = item.chordpro ?? "";
  if (cifra.trim() && item.transpose) cifra = transpose(cifra, item.transpose);
  if (hide) cifra = stripChords(cifra);
  const html = cifra.trim() ? toHtml(cifra) : "";

  return (
    <div style={{ margin: "10px 0 16px" }}>
      <div style={{ fontWeight: 600 }}>
        {item.title}
        {item.transpose ? (
          <span style={{ color: "#888", fontWeight: 400, fontSize: 13 }}>
            {" "}
            (tom {item.transpose > 0 ? `+${item.transpose}` : item.transpose})
          </span>
        ) : null}
      </div>
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
  const arranged = arrangeRepertoire(pkg.slots, pkg.items);
  const slotsWithItems = arranged.slots.filter((s) => s.items.length > 0);

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      {header}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>{pkg.repertoire.title}</h1>
          <div style={{ color: "#888", fontSize: 14 }}>
            {REPERTOIRE_TYPE_LABELS[pkg.repertoire.type]}
            {pkg.repertoire.date ? ` · ${pkg.repertoire.date}` : ""}
          </div>
        </div>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />{" "}
          esconder cifra
        </label>
      </div>

      {slotsWithItems.length === 0 && arranged.unslotted.length === 0 && (
        <p style={{ color: "#888" }}>Este repertório ainda não tem músicas.</p>
      )}

      {slotsWithItems.map((s) => (
        <section key={s.key} style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, borderBottom: "2px solid #eee", paddingBottom: 2 }}>
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

      <footer style={{ marginTop: 32, color: "#bbb", fontSize: 12, textAlign: "center" }}>
        Asafe 🎵
      </footer>
    </main>
  );
}
