import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { moderationReason } from "./enums";
import { user } from "./user";

/**
 * Log de moderação: um evento por decisão (aprovar/recusar/devolver/revogar) sobre uma
 * música ou repertório. Resolve de uma vez a **devolutiva** (§6.1) e a **trilha de
 * auditoria** (REVISAO §5), e guarda a **provenance** das decisões. Alvo polimórfico
 * (`target_type` + `target_id`) cobre song e repertoire. Ver DIREITOS-AUTORAIS.
 *
 * RLS: lê o **moderador** (tudo) e o **dono do alvo** (os eventos das SUAS submissões).
 * Escrita: só via as funções `moderate_*` (security definer) — sem policy de INSERT.
 */
export const moderationEvent = pgTable(
  "moderation_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(), // 'song' | 'repertoire'
    targetId: uuid("target_id").notNull(),
    moderatorId: uuid("moderator_id").references(() => user.id),
    decision: text("decision").notNull(), // 'approve' | 'reject' | 'return' | 'revoke'
    reason: moderationReason("reason"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("moderation_event_target_idx").on(t.targetType, t.targetId),
    pgPolicy("moderation_event_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`public.is_moderator()
        or (${t.targetType} = 'song' and exists (select 1 from song s where s.id = ${t.targetId} and s.owner_id = auth.uid()))
        or (${t.targetType} = 'repertoire' and exists (select 1 from repertoire r where r.id = ${t.targetId} and r.owner_id = auth.uid()))`,
    }),
  ],
).enableRLS();
