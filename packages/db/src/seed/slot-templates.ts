import { slotTemplate } from "../schema/slotTemplate";
import type { db as Db } from "../client";

/** Um momento dentro de um template de slots (PLANNING.md §7). */
export interface SlotDef {
  key: string;
  label: string;
  optional: boolean;
}

interface SlotTemplateSeed {
  type: "Missa" | "Casamento" | "Adoracao" | "Terco" | "GrupoDeOracao" | "Sarau";
  slots: SlotDef[];
  reorderable: boolean;
  allowCustomSlots: boolean;
}

const s = (key: string, label: string, optional = false): SlotDef => ({
  key,
  label,
  optional,
});

/**
 * Sementes de slot_template por tipo (PLANNING.md §7).
 *
 * O template SEMEIA a sequência; a sequência final mora no repertoire_item. Mudar o
 * template depois NÃO reescreve repertórios antigos.
 *
 * - Missa: estrutura canônica (reorderable=false) — a ordem é a forma do rito. O que
 *   varia é condicional (Glória/Ação de graças opcionais; Salmo é próprio do dia).
 * - Grupo de oração / Sarau / Adoração / Terço / Casamento: estrutura sugerida
 *   (reorderable=true) — semeia uma sequência típica, mas a equipe ajusta à vontade.
 */
export const SLOT_TEMPLATES: SlotTemplateSeed[] = [
  {
    type: "Missa",
    reorderable: false,
    allowCustomSlots: true,
    slots: [
      s("entrada", "Entrada"),
      s("ato_penitencial", "Ato Penitencial", true),
      s("gloria", "Glória", true),
      s("salmo", "Salmo Responsorial"),
      s("aclamacao", "Aclamação ao Evangelho"),
      s("ofertorio", "Ofertório"),
      s("santo", "Santo"),
      s("cordeiro", "Cordeiro"),
      s("comunhao", "Comunhão"),
      s("acao_de_gracas", "Ação de Graças", true),
      s("final", "Final"),
    ],
  },
  {
    type: "Casamento",
    reorderable: true,
    allowCustomSlots: true,
    slots: [
      s("entrada_padrinhos", "Entrada dos Padrinhos"),
      s("entrada_noivo", "Entrada do Noivo"),
      s("pajens_daminhas", "Pajens / Daminhas"),
      s("entrada_noiva", "Entrada da Noiva"),
      s("salmo", "Salmo Responsorial"),
      s("aclamacao", "Aclamação ao Evangelho"),
      s("comunhao", "Comunhão"),
      s("assinaturas", "Assinaturas"),
      s("saida", "Saída"),
    ],
  },
  {
    type: "GrupoDeOracao",
    reorderable: true,
    allowCustomSlots: true,
    slots: [
      s("abertura", "Abertura"),
      s("louvor", "Louvor"),
      s("adoracao", "Adoração"),
      s("ministracao", "Ministração", true),
      s("envio", "Envio"),
    ],
  },
  {
    type: "Adoracao",
    reorderable: true,
    allowCustomSlots: true,
    slots: [
      s("exposicao", "Exposição do Santíssimo"),
      s("adoracao", "Adoração"),
      s("bencao", "Bênção do Santíssimo"),
    ],
  },
  {
    type: "Terco",
    reorderable: true,
    allowCustomSlots: true,
    slots: [
      s("abertura", "Abertura", true),
      s("misterios", "Mistérios"),
      s("final", "Final", true),
    ],
  },
  {
    type: "Sarau",
    reorderable: true,
    allowCustomSlots: true,
    slots: [],
  },
];

/** Semeia (idempotente) os slot_template. Roda como `postgres` (contorna RLS). */
export async function seedSlotTemplates(db: typeof Db): Promise<void> {
  for (const tpl of SLOT_TEMPLATES) {
    await db
      .insert(slotTemplate)
      .values(tpl)
      .onConflictDoUpdate({
        target: slotTemplate.type,
        set: {
          slots: tpl.slots,
          reorderable: tpl.reorderable,
          allowCustomSlots: tpl.allowCustomSlots,
        },
      });
  }
}
