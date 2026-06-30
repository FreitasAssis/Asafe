import { and, eq, isNull } from "drizzle-orm";
import { tag } from "../schema/tag";
import type { db as Db } from "../client";

/**
 * Tags GLOBAIS (owner_id nulo) das categorias mais "fechadas" — vocabulário
 * padronizado que todos veem (DESIGN/fatia C2). As categorias abertas (tema, ocasiao,
 * salmo, fonte) ficam para tags pessoais.
 */
export const GLOBAL_TAGS: { category: "momento" | "tempo_liturgico"; names: string[] }[] = [
  {
    category: "momento",
    names: [
      "Entrada",
      "Ato Penitencial",
      "Glória",
      "Salmo",
      "Aclamação",
      "Ofertório",
      "Santo",
      "Cordeiro",
      "Comunhão",
      "Ação de Graças",
      "Final",
    ],
  },
  {
    category: "tempo_liturgico",
    names: [
      "Advento",
      "Natal",
      "Tempo Comum",
      "Quaresma",
      "Tríduo Pascal",
      "Páscoa",
      "Pentecostes",
    ],
  },
];

/** Semeia (idempotente) as tags globais. Insere só as que ainda não existem. */
export async function seedGlobalTags(db: typeof Db): Promise<void> {
  for (const { category, names } of GLOBAL_TAGS) {
    const existing = await db
      .select({ name: tag.name })
      .from(tag)
      .where(and(eq(tag.category, category), isNull(tag.ownerId)));
    const have = new Set(existing.map((r) => r.name));
    const missing = names.filter((n) => !have.has(n));
    if (missing.length > 0) {
      await db.insert(tag).values(missing.map((name) => ({ name, category })));
    }
  }
}
