"use client";

import { useEffect, useState } from "react";
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
export function LiturgyHeader({
  liturgy,
  defaultOpen = false,
}: {
  readonly liturgy: LiturgyContext | null;
  /** Já abre as leituras e busca o texto ao montar (ex.: página Liturgia diária). */
  readonly defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [texts, setTexts] = useState<ReadingWithText[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Busca o texto quando as leituras estão abertas — CHAVEADO pela data, para
  // rebuscar quando o dia muda (ex.: seletor da Liturgia diária). Limpa o texto
  // anterior enquanto carrega; o `alive` evita gravar resultado de data trocada.
  const date = liturgy?.date;
  useEffect(() => {
    if (!open || !date) return;
    let alive = true;
    setLoading(true);
    setTexts(null);
    void getDayReadingTexts(date)
      .then((rs) => alive && setTexts(rs))
      .catch(() => alive && setTexts([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, date]);

  if (!liturgy) return null;

  async function copy(kind: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
    } catch {
      // área de transferência indisponível (ex.: contexto não seguro) — ignora
    }
  }

  function toggle() {
    setOpen((o) => !o); // o efeito acima cuida de carregar o texto na 1ª abertura
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
        onClick={toggle}
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
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>
                    {READING_LABELS[r.kind]}
                    {r.ref ? (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {r.ref}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copy(r.kind, r.refrain ? `${r.refrain}\n\n${r.text}` : r.text)}
                    title="Copiar o texto para criar uma música no catálogo"
                    style={{ fontSize: 12, fontWeight: 400, color: "var(--primary)" }}
                  >
                    {copied === r.kind ? "copiado ✓" : "copiar"}
                  </button>
                </div>
                {r.title && (
                  <div style={{ fontStyle: "italic", fontSize: 13, color: "var(--text-muted)" }}>
                    {r.title}
                  </div>
                )}
                {r.refrain && (
                  <p style={{ fontWeight: 600, margin: "4px 0 0", fontSize: 14 }}>
                    <span style={{ color: "var(--text-muted)" }}>Refrão:</span> {r.refrain}
                  </p>
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
