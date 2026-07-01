/** Normaliza nome de tag para comparar: sem acento, minúsculo, espaços colapsados. */
export function normalizeTagName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Duplicata exata de uma tag existente (mesmo nome ignorando acento/caixa/espaços) —
 * usado para **reusar em vez de criar** uma segunda igual. Diferente do aviso, vale
 * para qualquer tamanho de nome. O chamador escolhe o universo (ex.: mesma categoria).
 */
export function findExactTag<T extends { name: string }>(
  name: string,
  existing: readonly T[],
): T | undefined {
  const n = normalizeTagName(name);
  if (!n) return undefined;
  return existing.find((t) => normalizeTagName(t.name) === n);
}

/**
 * Tags existentes "parecidas" com um nome que o usuário está prestes a criar — para
 * avisar (não bloquear) antes de criar uma quase-duplicata: "Maria" vs "Maria mãe",
 * "maria" vs "María". Considera parecido quando, ignorando acento/caixa, um nome
 * contém o outro por inteiro (mínimo 3 letras, para não gerar ruído com nomes curtos).
 *
 * O chamador decide o universo comparado (normalmente as tags da mesma categoria).
 */
export function findSimilarTags<T extends { name: string }>(
  name: string,
  existing: readonly T[],
): T[] {
  const n = normalizeTagName(name);
  if (n.length < 3) return [];
  return existing.filter((t) => {
    const tn = normalizeTagName(t.name);
    if (tn.length < 3) return false;
    return tn.includes(n) || n.includes(tn);
  });
}
