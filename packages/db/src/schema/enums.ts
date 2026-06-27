import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums de domínio do Asafe (ver PLANNING.md §5).
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
  "Sarau",
]);

export const tagOverrideAction = pgEnum("tag_override_action", [
  "add",
  "remove",
]);

export const visibility = pgEnum("visibility", ["private", "group", "public"]);
