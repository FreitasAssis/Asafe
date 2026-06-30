import type { TagCategory } from "./types";

/** Rótulos em PT das categorias de tag (DESIGN §5). */
export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  momento: "Momento",
  tempo_liturgico: "Tempo litúrgico",
  tema: "Tema",
  ocasiao: "Ocasião",
  fonte: "Fonte",
  salmo: "Salmo",
};

/**
 * Cor por categoria, para os chips do catálogo/editor/filtro.
 * PROVISÓRIO — a realinhar quando a identidade visual do app (DESIGN §10) tiver paleta.
 * Centralizado aqui para trocar num lugar só.
 */
export const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  momento: "#2563eb", // azul
  tempo_liturgico: "#d97706", // âmbar
  tema: "#059669", // verde
  ocasiao: "#db2777", // rosa
  salmo: "#7c3aed", // roxo
  fonte: "#475569", // cinza
};

/** Categorias "fechadas" (vêm de tags globais prontas) vs "abertas" (tags pessoais). */
export const OPEN_TAG_CATEGORIES: TagCategory[] = ["tema", "ocasiao", "salmo", "fonte"];
export const CLOSED_TAG_CATEGORIES: TagCategory[] = ["momento", "tempo_liturgico"];
