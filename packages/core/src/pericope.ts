/**
 * Perícope: decomposição de uma referência bíblica em SEGMENTOS (livro, capítulo,
 * intervalo de versículos) e casamento por SOBREPOSIÇÃO (A4, DESIGN.md §6).
 *
 * É o que faz o vínculo música↔leitura sobreviver a recortes diferentes: um canto
 * ligado a "Lc 15,11-32" reaparece quando o dia vem "Lc 15,1-3.11-32" — casa por
 * interseção de intervalos, não por string igual.
 *
 * Função pura, sem rede. Referência ininteligível → nenhum segmento (degrada).
 */

/** Fim sentinela de "capítulo inteiro" (salmos vão até ~176 versículos). */
export const WHOLE_CHAPTER_END = 999;

export interface PericopeSegment {
  /** Livro normalizado (maiúsculas, sem acento/espaço): "LC", "1COR". */
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

/** "1 Cor" / "1Cor" / "Lc." → "1COR" / "1COR" / "LC". */
function normalizeBook(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

const int = (s: string) => Number.parseInt(s, 10);

// Livro no início: "Lc" · "1Cor" · "1 Cor"
const BOOK = /^(\d?\s*\p{L}+)\s*(.*)$/su;
// Um grupo de capítulo: "15,11-32" · "101(102)" · "24,1-8.62-67"
const GROUP = /^(\d+)\s*(?:\((\d+)\))?\s*(?:,\s*(.*))?$/s;
const CROSS_CHAPTER = /^(\d+)[a-z]?\s*-\s*(\d+)\s*,\s*(\d+)[a-z]?$/i; // 36-10,8
const RANGE = /^(\d+)[a-z]?\s*-\s*(\d+)[a-z]?$/i; // 11-32 · 6b-8 · 1-12a
const SINGLE = /^(\d+)[a-z]?$/i; // 9 · 34

/** Um trecho da lista de versículos: "11-32", "6b-8", "9" ou "36-10,8". */
function parseVerseItem(book: string, chapter: number, item: string): PericopeSegment[] {
  if (!item) return [];

  const cross = CROSS_CHAPTER.exec(item);
  if (cross) {
    // do versículo inicial até o fim do capítulo, e do início do próximo até o fim da faixa
    return [
      { book, chapter, verseStart: int(cross[1]!), verseEnd: WHOLE_CHAPTER_END },
      { book, chapter: int(cross[2]!), verseStart: 1, verseEnd: int(cross[3]!) },
    ];
  }

  const range = RANGE.exec(item);
  if (range) return [{ book, chapter, verseStart: int(range[1]!), verseEnd: int(range[2]!) }];

  const single = SINGLE.exec(item);
  if (single) {
    const v = int(single[1]!);
    return [{ book, chapter, verseStart: v, verseEnd: v }];
  }
  return [];
}

/** Um grupo de capítulo: "15,11-32" · "101(102)" · "24,1-8.62-67". */
function parseGroup(book: string, group: string): PericopeSegment[] {
  const g = GROUP.exec(group);
  if (!g) return [];

  const chapter = int(g[1]!);
  const altChapter = g[2] ? int(g[2]) : null;
  const versePart = (g[3] ?? "").trim();
  if (!Number.isFinite(chapter)) return [];

  // Sem versículos = capítulo inteiro (e a numeração alternativa vira outro segmento).
  if (!versePart) {
    const whole = (c: number): PericopeSegment => ({
      book,
      chapter: c,
      verseStart: 1,
      verseEnd: WHOLE_CHAPTER_END,
    });
    return altChapter ? [whole(chapter), whole(altChapter)] : [whole(chapter)];
  }

  return versePart.split(".").flatMap((raw) => parseVerseItem(book, chapter, raw.trim()));
}

/**
 * Decompõe uma referência ("Lc 15,1-3.11-32") nos seus segmentos. Trata: livro
 * numerado (1Cor/1 Cor), sufixo de letra (6b, 12a), vários trechos separados por
 * ponto, faixa que atravessa capítulo (Mt 9,36-10,8), salmo com numeração
 * alternativa (Sl 101(102) → casa 101 e 102) e **grupos de capítulo separados por
 * ponto e vírgula** ("Gn 23,1-4.19; 24,1-8.62-67").
 */
export function parseReadingRef(ref: string): PericopeSegment[] {
  const text = (ref ?? "").trim();
  if (!text) return [];

  const m = BOOK.exec(text);
  if (!m) return [];
  const book = normalizeBook(m[1]!);
  const rest = (m[2] ?? "").trim();
  if (!book || !rest) return [];

  return rest.split(";").flatMap((g) => parseGroup(book, g.trim()));
}

/** Dois conjuntos de segmentos se cruzam? (mesmo livro/capítulo e intervalos que se tocam) */
export function segmentsOverlap(a: PericopeSegment[], b: PericopeSegment[]): boolean {
  return a.some((x) =>
    b.some(
      (y) =>
        x.book === y.book &&
        x.chapter === y.chapter &&
        x.verseStart <= y.verseEnd &&
        y.verseStart <= x.verseEnd,
    ),
  );
}

/** Atalho: duas REFERÊNCIAS se cruzam? (parseia as duas e compara os segmentos) */
export function refsOverlap(refA: string, refB: string): boolean {
  return segmentsOverlap(parseReadingRef(refA), parseReadingRef(refB));
}
