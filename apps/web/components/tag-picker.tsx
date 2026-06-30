"use client";

import { useState } from "react";
import {
  CLOSED_TAG_CATEGORIES,
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

function NewTagInput({ onCreate }: { onCreate: (name: string) => void }) {
  const [value, setValue] = useState("");
  function add() {
    const name = value.trim();
    if (!name) return;
    onCreate(name);
    setValue("");
  }
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
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
              {isOpen && <NewTagInput onCreate={(name) => onCreate(name, cat)} />}
            </div>
          </div>
        );
      })}
    </section>
  );
}
