"use client";

import { useMemo, useState } from "react";
import {
  CLOSED_TAG_CATEGORIES,
  findSimilarTags,
  OPEN_TAG_CATEGORIES,
  TAG_CATEGORY_COLORS,
  TAG_CATEGORY_LABELS,
  type TagCategory,
} from "@asafe/core";
import type { Tag } from "@/lib/songs";

function chipStyle(color: string, on: boolean): React.CSSProperties {
  return {
    padding: "3px 10px",
    borderRadius: 999,
    border: `1px solid ${color}`,
    background: on ? color : "transparent",
    color: on ? "#fff" : color,
    fontSize: 13,
    cursor: "pointer",
  };
}

function NewTagInput({
  existing,
  color,
  onCreate,
  onPickExisting,
}: {
  readonly existing: Tag[];
  readonly color: string;
  readonly onCreate: (name: string) => void;
  readonly onPickExisting: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  // Tags parecidas já existentes (aviso, não bloqueia): "Maria" vs "Maria mãe".
  const similar = useMemo(() => findSimilarTags(value, existing), [value, existing]);

  function add() {
    const name = value.trim();
    if (!name) return;
    onCreate(name);
    setValue("");
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 3 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder="+ nova tag"
        style={{ padding: "2px 8px", fontSize: 13, width: 110 }}
      />
      {similar.length > 0 && (
        <span style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220 }}>
          Já existe:{" "}
          {similar.map((t) => (
            <button
              key={t.id}
              type="button"
              title="Usar esta tag em vez de criar outra"
              onClick={() => {
                onPickExisting(t.id);
                setValue("");
              }}
              style={{ color, textDecoration: "underline", cursor: "pointer", marginRight: 6 }}
            >
              {t.name}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/**
 * Seletor de tags por categoria (DESIGN/fatia C2). Categorias fechadas (momento,
 * tempo) mostram tags globais; abertas (tema, ocasião, salmo, fonte) mostram as pessoais
 * + criação inline. Componente controlado.
 */
export function TagPicker({
  tags,
  selected,
  onToggle,
  onCreate,
}: {
  tags: Tag[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onCreate: (name: string, category: TagCategory) => void;
}) {
  const categories: TagCategory[] = [...CLOSED_TAG_CATEGORIES, ...OPEN_TAG_CATEGORIES];
  return (
    <section style={{ marginTop: 16 }}>
      <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Tags</label>
      {categories.map((cat) => {
        const catTags = tags.filter((t) => t.category === cat);
        const color = TAG_CATEGORY_COLORS[cat];
        const isOpen = OPEN_TAG_CATEGORIES.includes(cat);
        return (
          <div key={cat} style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color }}>{TAG_CATEGORY_LABELS[cat]}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, alignItems: "center" }}>
              {catTags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onToggle(t.id)}
                  style={chipStyle(color, selected.has(t.id))}
                >
                  {t.name}
                </button>
              ))}
              {isOpen && (
                <NewTagInput
                  existing={catTags}
                  color={color}
                  onCreate={(name) => onCreate(name, cat)}
                  onPickExisting={onToggle}
                />
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
