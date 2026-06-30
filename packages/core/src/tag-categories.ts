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
// Tons dessaturados e sóbrios, harmônicos com a paleta "papel e tinta" e legíveis
// nos dois temas (claro/escuro). Ver docs/identidade-visual.md.
export const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  momento: "#45527d", // índigo médio
  tempo_liturgico: "#9a6a35", // âmbar/latão
  tema: "#4f7a55", // verde
  ocasiao: "#a05a74", // rosa
  salmo: "#6f5f93", // roxo
  fonte: "#6e685c", // pedra
};

/** Categorias "fechadas" (vêm de tags globais prontas) vs "abertas" (tags pessoais). */
export const OPEN_TAG_CATEGORIES: TagCategory[] = ["tema", "ocasiao", "salmo", "fonte"];
export const CLOSED_TAG_CATEGORIES: TagCategory[] = ["momento", "tempo_liturgico"];
