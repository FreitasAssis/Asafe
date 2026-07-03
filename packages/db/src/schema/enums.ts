import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums de domínio do Asafe (ver DESIGN.md §4).
 * Os valores casam 1:1 com as uniões de literais em @asafe/core (types.ts).
 */
export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "editor",
  "viewer",
]);

export const tagCategory = pgEnum("tag_category", [
  "momento",
  "tempo_liturgico",
  "tema",
  "ocasiao",
  "fonte",
  "salmo",
]);

export const repertoireType = pgEnum("repertoire_type", [
  "Missa",
  "Casamento",
  "Adoracao",
  "Terco",
  "GrupoDeOracao",
  "Livre",
]);

export const tagOverrideAction = pgEnum("tag_override_action", [
  "add",
  "remove",
]);

export const visibility = pgEnum("visibility", ["private", "group", "public"]);

/** Estado de publicação na comunidade (moderado). `returned` = devolvida para ajuste. */
export const communityStatus = pgEnum("community_status", [
  "none",
  "pending",
  "approved",
  "rejected",
  "returned",
]);

/** Motivo estruturado da decisão de moderação (vira dado; alimenta a devolutiva). */
export const moderationReason = pgEnum("moderation_reason", [
  "autoria_status_incorreto",
  "protegida_sem_permissao",
  "duplicada",
  "qualidade_cifra",
  "outro",
]);

/**
 * Status de copyright de uma música — decidido só no gate de promoção ao global.
 * Por padrão `desconhecida` (assume-se protegida). Ver DIREITOS-AUTORAIS (política).
 */
export const copyrightStatus = pgEnum("copyright_status", [
  "dominio_publico",
  "licenca_aberta",
  "permissao",
  "protegida",
  "desconhecida",
]);
