/** Um momento do template (DESIGN §7). */
export interface SlotDef {
  key: string;
  label: string;
  optional: boolean;
  /** Dica contextual (ex.: a referência do salmo do dia, vinda da liturgia). */
  hint?: string;
}

/** Mínimo que um item de repertório precisa para ser arranjado. */
export interface ArrangeableItem {
  momentSlot: string | null;
  order: number;
}

export interface ArrangedSlot<T> extends SlotDef {
  items: T[];
}

export interface ArrangedRepertoire<T> {
  slots: ArrangedSlot<T>[];
  /** Itens sem momento (Livre) ou com momento fora do template. */
  unslotted: T[];
}

const byOrder = <T extends ArrangeableItem>(a: T, b: T) => a.order - b.order;

/**
 * Organiza os itens de um repertório para exibição (DESIGN/fatia D1): cada momento do
 * template, na ordem do template, com suas músicas ordenadas por `order`; itens sem slot
 * (Livre) ou com slot fora do template caem em `unslotted`. Momentos vazios são mantidos
 * (para o usuário ver o slot a preencher). Função pura, não muta a entrada.
 */
export function arrangeRepertoire<T extends ArrangeableItem>(
  slots: SlotDef[],
  items: T[],
): ArrangedRepertoire<T> {
  const slotKeys = new Set(slots.map((s) => s.key));

  const arrangedSlots: ArrangedSlot<T>[] = slots.map((slot) => ({
    ...slot,
    items: items.filter((i) => i.momentSlot === slot.key).sort(byOrder),
  }));

  const unslotted = items
    .filter((i) => i.momentSlot === null || !slotKeys.has(i.momentSlot))
    .sort(byOrder);

  return { slots: arrangedSlots, unslotted };
}
