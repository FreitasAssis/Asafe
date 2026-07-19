import type { ReadingRef } from "@asafe/core";

/** Rótulos em pt das leituras — compartilhado pelo cabeçalho e pelos modos de palco. */
export const READING_LABELS: Record<ReadingRef["kind"], string> = {
  primeira: "1ª leitura",
  salmo: "Salmo",
  segunda: "2ª leitura",
  evangelho: "Evangelho",
  sequencia: "Sequência",
};
