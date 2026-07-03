import type { CopyrightStatus } from "./types";

/**
 * Escolha de atribuição no **gate de promoção ao global** — o que o proponente declara
 * sobre a autoria. Alimenta o `copyright_status` da música (ver DIREITOS-AUTORAIS §5).
 */
export type AttributionChoice = "propria" | "dominio_publico" | "autor_nomeado" | "desconhecida";

export const ATTRIBUTION_CHOICES: readonly AttributionChoice[] = [
  "propria",
  "dominio_publico",
  "autor_nomeado",
  "desconhecida",
];

export const ATTRIBUTION_LABELS: Record<AttributionChoice, string> = {
  propria: "É de minha autoria",
  dominio_publico: "Tradicional / domínio público",
  autor_nomeado: "De outro autor (protegida)",
  desconhecida: "Não sei / autoria desconhecida",
};

/** Dica curta que ajuda o proponente a escolher certo. */
export const ATTRIBUTION_HINTS: Record<AttributionChoice, string> = {
  propria: "Você compôs a letra/melodia. Você autoriza (licencia) o uso na plataforma.",
  dominio_publico: "Obra antiga (autor morto há +70 anos), gregoriano ou hinário tradicional.",
  autor_nomeado:
    "Composição de outra pessoa, ainda protegida. Você continua usando normalmente no seu acervo e nos seus grupos — nada muda aí. Para entrar no catálogo global com a cifra, precisamos da permissão do autor; e vamos atrás disso (quanto mais gente usa, mais forte fica o pedido). Até lá, ela aparece só como referência.",
  desconhecida: "Na dúvida, marque aqui — por segurança tratamos como protegida.",
};

/** Mapa da escolha para o `copyright_status` gravado. `propria` é refinada pelo consentimento (C4). */
export const ATTRIBUTION_TO_STATUS: Record<AttributionChoice, CopyrightStatus> = {
  propria: "licenca_aberta",
  dominio_publico: "dominio_publico",
  autor_nomeado: "protegida",
  desconhecida: "desconhecida",
};
