import type { RepertoireType } from "./types";

/** Tipos de repertório, na ordem de exibição (Missa primeiro). */
export const REPERTOIRE_TYPES: RepertoireType[] = [
  "Missa",
  "GrupoDeOracao",
  "Casamento",
  "Adoracao",
  "Terco",
  "Sarau",
];

/** Rótulos em PT dos tipos de repertório. */
export const REPERTOIRE_TYPE_LABELS: Record<RepertoireType, string> = {
  Missa: "Missa",
  Casamento: "Casamento",
  Adoracao: "Adoração",
  Terco: "Terço",
  GrupoDeOracao: "Grupo de oração",
  Sarau: "Sarau",
};
