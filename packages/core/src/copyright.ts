import { normalizeTagName } from "./tag-similarity";
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

// Marcadores de obra tradicional / domínio público no campo compositor.
const TRADITIONAL_MARKERS = [
  "tradicional",
  "gregoriano",
  "popular",
  "anonimo",
  "dominio publico",
  "folclore",
  "medieval",
];

// Compositores/ministérios contemporâneos reconhecidos (protegidos). Lista curada — cresce
// com o uso/moderação; foco em RCC e comunidades (Shalom, etc.).
const KNOWN_PROTECTED = [
  "fabio de melo",
  "zezinho",
  "ziza fernandes",
  "celina borges",
  "reginaldo manzotti",
  "adriana arydes",
  "walmir alencar",
  "thiago brado",
  "eros biondini",
  "dunga",
  "anjos de resgate",
  "alessandro campos",
  "ministerio amor e adoracao",
  "gabriel santana",
  "shalom",
  "colo de deus",
  "cancao nova",
  "juninho cassimiro",
  "rosa de saron",
];

/**
 * Primeira rede da C6: sugere a atribuição provável a partir do **compositor** — marcador
 * tradicional → domínio público; um autor nomeado (não tradicional) → provavelmente
 * protegida. Sugere, não decide (`null` = sem palpite). Ver DIREITOS-AUTORAIS §6.1.
 */
export function suggestAttribution(composer: string | null): AttributionChoice | null {
  if (!composer?.trim()) return null;
  const n = normalizeTagName(composer);
  if (TRADITIONAL_MARKERS.some((m) => n.includes(m))) return "dominio_publico";
  return "autor_nomeado";
}

/**
 * Aviso (não bloqueia) quando a escolha do proponente **contradiz** o compositor:
 * marcou domínio público mas nomeou um autor; ou marcou "própria" mas é um compositor
 * conhecido. `null` quando coerente ou sem compositor.
 */
export function attributionWarning(
  choice: AttributionChoice,
  composer: string | null,
): string | null {
  if (!composer?.trim()) return null;
  const n = normalizeTagName(composer);
  const traditional = TRADITIONAL_MARKERS.some((m) => n.includes(m));
  const known = KNOWN_PROTECTED.some((k) => n.includes(k));
  if (choice === "dominio_publico" && !traditional) {
    return `Você marcou domínio público, mas nomeou "${composer}". Domínio público costuma ser obra antiga (autor morto há mais de 70 anos) — confirme se é o caso.`;
  }
  if (choice === "propria" && known) {
    return `Você marcou "de minha autoria", mas "${composer}" parece ser de outro compositor conhecido — confirme.`;
  }
  return null;
}

/** Licença que o autor escolhe ao publicar obra própria (casa com o enum `license_kind`). */
export type LicenseKind = "cc_by" | "cc_by_sa" | "permissao_asafe";

export const LICENSE_CHOICES: readonly LicenseKind[] = ["cc_by", "cc_by_sa", "permissao_asafe"];

export const LICENSE_LABELS: Record<LicenseKind, string> = {
  cc_by: "Creative Commons BY (atribuição)",
  cc_by_sa: "Creative Commons BY-SA (atribuição + compartilha igual)",
  permissao_asafe: "Permissão ao Asafe (licença não-exclusiva para a plataforma)",
};

export const LICENSE_HINTS: Record<LicenseKind, string> = {
  cc_by: "Qualquer um pode usar, inclusive fora do Asafe, desde que te credite.",
  cc_by_sa: "Como a CC BY, mas as obras derivadas mantêm a mesma licença.",
  permissao_asafe: "Você autoriza o uso na plataforma; mantém todos os seus direitos.",
};

/** Versão do texto de consentimento. **IMUTÁVEL por versão** — texto novo = versão nova. */
export const CONSENT_TEXT_VERSION = "obra-propria-v1";

/**
 * Texto do consentimento de obra própria (§7). **PLACEHOLDER — a confirmar juridicamente
 * (§11).** Não altere o texto desta versão; para mudar, crie uma versão nova (o registro
 * aponta a versão aceita, com valor probatório).
 */
export const CONSENT_TEXT =
  "Declaro que esta obra é de minha autoria e que tenho os direitos necessários para " +
  "licenciá-la. Concedo ao Asafe uma licença não-exclusiva, mundial e gratuita para exibir, " +
  "distribuir e adaptar (transpor) esta obra na plataforma e por quem a comunidade compartilhar, " +
  "conforme a licença que eu escolher. Continuo sendo o autor e titular — isto é uma licença, " +
  "não uma cessão. Posso retirar a obra quando quiser (a retirada não desfaz usos já feitos de boa-fé).";
