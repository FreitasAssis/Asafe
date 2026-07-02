import { sql } from "drizzle-orm";
import { boolean, jsonb, pgPolicy, pgTable } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { repertoireType } from "./enums";

/**
 * Template de slots (ver DESIGN.md §4/§5).
 * Dado de REFERÊNCIA: semeia a sequência de momentos por tipo de repertório.
 * PK = type (um template por tipo).
 *
 * RLS:
 *  - SELECT: legível por qualquer logado (using true). O seed vem na próxima task;
 *    aqui só a tabela + policy de leitura.
 */
export const slotTemplate = pgTable(
  "slot_template",
  {
    type: repertoireType("type").primaryKey(),
    slots: jsonb("slots").notNull(),
    reorderable: boolean("reorderable").notNull(),
    allowCustomSlots: boolean("allow_custom_slots").notNull(),
  },
  () => [
    pgPolicy("slot_template_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();
