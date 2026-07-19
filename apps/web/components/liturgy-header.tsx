"use client";

import { useState } from "react";
import { LITURGICAL_COLOR_HEX, type LiturgyContext, type ReadingRef, type ReadingWithText } from "@asafe/core";
import { getDayReadingTexts } from "@/lib/liturgy/read-actions";

const READING_LABELS: Record<ReadingRef["kind"], string> = {
  primeira: "1ª leitura",
  salmo: "Salmo",
  segunda: "2ª leitura",
  evangelho: "Evangelho",
  sequencia: "Sequência",
};

/**
 * Cabeçalho litúrgico da Missa (A3): celebração, tempo/cor e as leituras do dia.
 * "Ler as leituras" busca o TEXTO ao vivo (server action → fonte), exibido com
 * crédito à CNBB e NUNCA persistido (ver A0/§6). Não renderiza nada sem liturgia.
 */
export function LiturgyHeader({ liturgy }: { readonly liturgy: LiturgyContext | null }) {
  const [open, setOpen] = useState(false);
  const [texts, setTexts] = useState<ReadingWithText[] | null>(null);
  const [loading, setLoading] = useState(false);

  if (!liturgy) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && texts === null && liturgy) {
      setLoading(true);
      try {
        setTexts(await getDayReadingTexts(liturgy.date));
      } catch {
        setTexts([]);
      }
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 12,
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface, transparent)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          aria-hidden
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: LITURGICAL_COLOR_HEX[liturgy.color],
            border: "1px solid var(--border)",
          }}
        />
        <strong>{liturgy.celebration}</strong>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          · {liturgy.seasonLabel} · {liturgy.colorLabel}
        </span>
      </div>

      {liturgy.readings.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "8px 0 0",
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "2px 14px",
            fontSize: 13,
          }}
        >
          {liturgy.readings.map((r) => (
            <li key={r.kind}>
              <span style={{ color: "var(--text-muted)" }}>{READING_LABELS[r.kind]}:</span> {r.ref}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void toggle()}
        style={{ marginTop: 8, fontSize: 13, color: "var(--primary)" }}
      >
        {open ? "▲ ocultar leituras" : "▼ ler as leituras"}
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          {loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando…</p>}
          {!loading && texts !== null && texts.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Não foi possível carregar as leituras agora.
            </p>
          )}
          {!loading &&
            texts?.map((r) => (
              <div key={r.kind} style={{ margin: "12px 0" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {READING_LABELS[r.kind]}
                  {r.ref ? (
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {r.ref}</span>
                  ) : null}
                </div>
                {r.title && (
                  <div style={{ fontStyle: "italic", fontSize: 13, color: "var(--text-muted)" }}>
                    {r.title}
                  </div>
                )}
                <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", fontSize: 14 }}>{r.text}</p>
              </div>
            ))}
          {!loading && texts && texts.length > 0 && (
            <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              Texto litúrgico © CNBB — exibido da fonte, não armazenado pelo Asafe.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
