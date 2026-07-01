/** Uma música extraída do texto colado na importação em lote. */
export interface ParsedSong {
  title: string;
  /** Cifra crua (a conversão para ChordPro acontece na camada web). */
  body: string;
  tagIds: string[];
  warnings: string[];
}

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

/** Uma tag "casa" com uma linha curta de rótulo se o nome estiver contido nela (ou vice-versa). */
function matchTag(line: string, tags: { id: string; name: string }[]): string | null {
  if (line.length > 40) return null;
  const nl = norm(line);
  if (nl.length < 3) return null;
  for (const t of tags) {
    const nt = norm(t.name);
    if (nt.length >= 3 && (nl.includes(nt) || nt.includes(nl))) return t.id;
  }
  return null;
}

/**
 * Divide o texto colado (músicas separadas por uma linha `---`) e, por bloco, extrai
 * tags a partir de rótulos no topo (momento/tempo — só tags EXISTENTES), o título e a cifra.
 */
export function parseSongImport(
  text: string,
  tags: { id: string; name: string }[],
): ParsedSong[] {
  const blocks = text.split(/^[ \t]*---[ \t]*$/m);
  const songs: ParsedSong[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd());
    while (lines.length && !lines[0]!.trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop();
    if (lines.length === 0) continue;

    const tagIds: string[] = [];
    let i = 0;
    // Consome rótulos no topo (nunca a última linha, que precisa sobrar para o título).
    while (i < lines.length - 1) {
      const id = matchTag(lines[i]!, tags);
      if (!id) break;
      if (!tagIds.includes(id)) tagIds.push(id);
      i++;
    }

    const title = lines[i]?.trim() ?? "";
    const body = lines
      .slice(i + 1)
      .join("\n")
      .trim();

    const warnings: string[] = [];
    if (!title) warnings.push("sem título");
    if (!body) warnings.push("sem cifra");

    songs.push({ title, body, tagIds, warnings });
  }

  return songs;
}
