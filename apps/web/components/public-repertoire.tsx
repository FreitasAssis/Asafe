"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  applyLiturgy,
  arrangeRepertoire,
  audioProvider,
  REPERTOIRE_TYPE_LABELS,
  type LiturgicalSnapshot,
  type RepertoireType,
  type SlotDef,
} from "@asafe/core";
import { LiturgyHeader } from "./liturgy-header";
import { stripChords, toHtml, transpose } from "@asafe/chordpro";
import { readPrefs, writePrefs } from "@/lib/preferences";
import { formatTom } from "@/lib/tom";

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
  // Para o lápis por música na visualização in-app (ausentes no link público).
  songId?: string;
  songOwnerId?: string | null;
}

export interface SharedPackage {
  repertoire: {
    title: string;
    type: RepertoireType;
    date: string | null;
    liturgicalSnapshot?: LiturgicalSnapshot | null;
  };
  slots: SlotDef[];
  items: PublicItem[];
}

function ItemView({
  item,
  hide,
  editableByUserId,
  repertoireId,
}: {
  readonly item: PublicItem;
  readonly hide: boolean;
  readonly editableByUserId?: string;
  readonly repertoireId?: string;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  let cifra = item.chordpro ?? "";
  const isReference = !cifra.trim();
  if (cifra.trim() && item.transpose) cifra = transpose(cifra, item.transpose);
  if (hide) cifra = stripChords(cifra);
  const html = cifra.trim() ? toHtml(cifra) : "";
  // Lápis só nas MINHAS músicas (digitar uma cifra / corrigir a letra). Ao editar,
  // o "voltar" retorna a este repertório (via ?back=).
  const canEdit = Boolean(editableByUserId && item.songId && item.songOwnerId === editableByUserId);
  const backUrl = repertoireId ? `/repertorios/${repertoireId}` : "";
  const editHref = backUrl
    ? `/musicas/${item.songId}/editar?back=${encodeURIComponent(backUrl)}`
    : `/musicas/${item.songId}/editar`;

  return (
    <div style={{ margin: "10px 0 16px" }}>
      <div style={{ fontWeight: 600 }}>
        {item.title}
        {item.transpose ? (
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 13 }}>
            {" "}
            (tom {formatTom(item.transpose)})
          </span>
        ) : null}
        {/* Observação: escondida atrás do balão 💬, revela ao clicar (igual ao Ao vivo). */}
        {item.notes && (
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            aria-label={noteOpen ? "Esconder observação" : "Ver observação"}
            aria-expanded={noteOpen}
            style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 13, padding: "0 4px" }}
          >
            💬
          </button>
        )}
        {canEdit && (
          <a
            href={editHref}
            title="Editar a música (cifra/letra)"
            aria-label="Editar a música"
            style={{ textDecoration: "none", fontSize: 13, padding: "0 4px" }}
          >
            ✏️
          </a>
        )}
      </div>
      {/* Atribuição (direito moral, §5/§10): o autor aparece sempre que a obra é exibida. */}
      {item.composer && (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{item.composer}</div>
      )}
      {noteOpen && item.notes && (
        <div
          style={{
            whiteSpace: "pre-wrap",
            color: "#a60",
            fontSize: 13,
            fontStyle: "italic",
            borderLeft: "3px solid var(--border)",
            paddingLeft: 8,
            margin: "4px 0",
          }}
        >
          {item.notes}
        </div>
      )}
      {html && (
        <div
          className="chord-preview"
          style={{ marginTop: 4 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {isReference && (
        <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
          — cifra não disponível (referência)
        </div>
      )}
      {/* Áudios de referência: agora sempre (antes só apareciam quando não havia cifra). */}
      {item.audioLinks && item.audioLinks.length > 0 && (
        <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 13 }}>
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
  );
}

/** Página pública de leitura de um repertório (só leitura, sem login). */
export function PublicRepertoire({
  pkg,
  header,
  editableByUserId,
  repertoireId,
}: {
  readonly pkg: SharedPackage;
  /** Conteúdo opcional no topo (breadcrumb + lápis na visualização in-app). */
  readonly header?: ReactNode;
  /** Se presente, mostra o lápis nas músicas deste usuário (só na visualização in-app). */
  readonly editableByUserId?: string;
  /** Id do repertório atual, para o "voltar" do editor retornar aqui. */
  readonly repertoireId?: string;
}) {
  const [hide, setHide] = useState(false);
  useEffect(() => setHide(Boolean(readPrefs().hideChords)), []);
  const { slots, liturgy } = applyLiturgy(pkg.slots, pkg.repertoire.liturgicalSnapshot ?? null);
  const arranged = arrangeRepertoire(slots, pkg.items);
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

      <LiturgyHeader liturgy={liturgy} />

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
            <ItemView key={it.id} item={it} hide={hide} editableByUserId={editableByUserId} repertoireId={repertoireId} />
          ))}
        </section>
      ))}

      {arranged.unslotted.length > 0 && (
        <section style={{ marginTop: 16 }}>
          {arranged.unslotted.map((it) => (
            <ItemView key={it.id} item={it} hide={hide} editableByUserId={editableByUserId} repertoireId={repertoireId} />
          ))}
        </section>
      )}

      <footer style={{ marginTop: 32, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
        Asafe 🎵
      </footer>
    </main>
  );
}
