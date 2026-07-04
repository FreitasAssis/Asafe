import { normalizeTagName } from "./tag-similarity";

/**
 * Chave de identidade de uma música (título + compositor, normalizados). Usada para casar
 * "já tenho essa música" ao pegar um repertório da comunidade (C8): se a chave da música do
 * repertório de origem bate com uma das minhas, o clone usa a **minha versão** (cheia) em vez
 * da referência. Casamento aproximado por design — títulos genéricos podem colidir.
 */
export function songIdentityKey(title: string, composer: string | null): string {
  return `${normalizeTagName(title)}|${normalizeTagName(composer ?? "")}`;
}
