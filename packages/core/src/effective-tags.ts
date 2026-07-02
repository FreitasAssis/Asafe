import type { TagOverrideAction } from "./types";

/** Um override pessoal de tag sobre uma música global (§5). */
export interface TagOverride {
  tagId: string;
  action: TagOverrideAction;
}

/**
 * Tags efetivas que um usuário vê numa música global (DESIGN.md §4):
 *
 *   tags_efetivas = tags_globais − {removes do user} ∪ {adds do user}
 *
 * Override por **diferença** (universo discreto: presente/ausente). Os overrides são
 * aplicados em ordem, então o último vence em caso de add/remove conflitantes da mesma
 * tag. Não muta a entrada.
 */
export function effectiveTags(
  globalTagIds: string[],
  overrides: TagOverride[],
): Set<string> {
  const result = new Set(globalTagIds);
  for (const override of overrides) {
    if (override.action === "add") result.add(override.tagId);
    else result.delete(override.tagId);
  }
  return result;
}
