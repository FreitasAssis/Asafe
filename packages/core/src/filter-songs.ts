/**
 * Filtra músicas por tags selecionadas (DESIGN/fatia C2). A lógica do catálogo:
 * **E entre categorias, OU dentro da categoria**.
 *
 * `selectedGroups` é uma lista de grupos, um por categoria com seleção; cada grupo é a
 * lista de tagIds selecionados naquela categoria. Uma música casa se, para CADA grupo
 * não-vazio, ela tem ao menos uma das tags do grupo (OU dentro) — e isso vale para todos
 * os grupos (E entre). Sem grupos (ou todos vazios) → devolve tudo.
 */
export function filterSongs<T extends { tagIds: string[] }>(
  songs: T[],
  selectedGroups: string[][],
): T[] {
  const groups = selectedGroups.filter((g) => g.length > 0);
  if (groups.length === 0) return songs;
  return songs.filter((song) => {
    const songTags = new Set(song.tagIds);
    return groups.every((group) => group.some((id) => songTags.has(id)));
  });
}
