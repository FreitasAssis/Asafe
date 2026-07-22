import { and, eq, isNull } from "drizzle-orm";
import { tag } from "../schema/tag";
import type { db as Db } from "../client";

/**
 * Tags GLOBAIS (owner_id nulo): vocabulário base que todos veem. `momento` e
 * `tempo_liturgico` são fechados (padronizados); `tema` e `ocasiao` trazem um núcleo comum
 * global + cada usuário adiciona os seus. `salmo` e `fonte` seguem só pessoais.
 */
export const GLOBAL_TAGS: {
  category: "momento" | "tempo_liturgico" | "tema" | "ocasiao";
  names: string[];
}[] = [
  {
    category: "momento",
    names: [
      "Entrada",
      "Entrada da Bíblia",
      "Ato Penitencial",
      "Aspersão",
      "Glória",
      "Salmo",
      "Aclamação",
      "Ladainha",
      "Ofertório",
      "Santo",
      "Cordeiro",
      "Comunhão",
      "Ação de Graças",
      "Bênção da água",
      "Bênção do fogo",
      "Unção com óleo",
      "Homenagens",
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
  {
    category: "tema",
    names: ["Adoração", "Mártires", "Maria", "São José", "Espírito Santo", "Padroeiro(a)", "Vocação", "Diversos"],
  },
  {
    category: "ocasiao",
    names: ["Casamento", "Batizado", "Finados", "Corpus Christi"],
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
