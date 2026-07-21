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

// "Lc 15,11-32" · "1Cor 5,6b-8" · "Sl 101(102)" · "Mt 9,36-10,8"
const REF = /^(\d?\s*\p{L}+)\s*(\d+)\s*(?:\((\d+)\))?\s*(?:,\s*(.*))?$/u;
const CROSS_CHAPTER = /^(\d+)[a-z]?\s*-\s*(\d+)\s*,\s*(\d+)[a-z]?$/i; // 36-10,8
const RANGE = /^(\d+)[a-z]?\s*-\s*(\d+)[a-z]?$/i; // 11-32 · 6b-8 · 1-12a
const SINGLE = /^(\d+)[a-z]?$/i; // 9 · 34

/**
 * Decompõe uma referência ("Lc 15,1-3.11-32") nos seus segmentos. Trata: livro
 * numerado (1Cor/1 Cor), sufixo de letra (6b, 12a), vários trechos separados por
 * ponto, faixa que atravessa capítulo (Mt 9,36-10,8) e salmo com numeração
 * alternativa (Sl 101(102) → casa 101 e 102).
 */
export function parseReadingRef(ref: string): PericopeSegment[] {
  const text = (ref ?? "").trim();
  if (!text) return [];

  const m = REF.exec(text);
  if (!m) return [];

  const book = normalizeBook(m[1]!);
  const chapter = int(m[2]!);
  const altChapter = m[3] ? int(m[3]) : null;
  const versePart = (m[4] ?? "").trim();
  if (!book || !Number.isFinite(chapter)) return [];

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

  const segments: PericopeSegment[] = [];
  for (const raw of versePart.split(".")) {
    const item = raw.trim();
    if (!item) continue;

    const cross = CROSS_CHAPTER.exec(item);
    if (cross) {
      // do versículo inicial até o fim do capítulo, e do início do próximo até o fim da faixa
      segments.push({ book, chapter, verseStart: int(cross[1]!), verseEnd: WHOLE_CHAPTER_END });
      segments.push({ book, chapter: int(cross[2]!), verseStart: 1, verseEnd: int(cross[3]!) });
      continue;
    }

    const range = RANGE.exec(item);
    if (range) {
      segments.push({ book, chapter, verseStart: int(range[1]!), verseEnd: int(range[2]!) });
      continue;
    }

    const single = SINGLE.exec(item);
    if (single) {
      const v = int(single[1]!);
      segments.push({ book, chapter, verseStart: v, verseEnd: v });
    }
  }
  return segments;
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
