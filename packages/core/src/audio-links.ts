/**
 * Validação de links de áudio (DESIGN/fatia C1). Como uma música pode ser aberta por
 * link público, só aceitamos provedores conhecidos e compartilháveis — isso evita link
 * malicioso embutido em conteúdo compartilhado.
 */

export type AudioProvider =
  | "youtube"
  | "spotify"
  | "deezer"
  | "soundcloud"
  | "apple-music";

/** Quantidade máxima de links de áudio por música. */
export const MAX_AUDIO_LINKS = 3;

/** Provedor → sufixos de domínio aceitos (cobre subdomínios: open.spotify.com, etc.). */
const PROVIDER_HOSTS: Record<AudioProvider, string[]> = {
  youtube: ["youtube.com", "youtu.be"],
  spotify: ["spotify.com"],
  deezer: ["deezer.com"],
  soundcloud: ["soundcloud.com"],
  "apple-music": ["music.apple.com"],
};

/** host casa com o sufixo se for igual a ele ou um subdomínio (`.suffix`). */
function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith("." + suffix);
}

/**
 * Retorna o provedor de um link de áudio, ou `null` se a URL for inválida, usar um
 * protocolo não-web, ou não pertencer a um provedor da whitelist.
 */
export function audioProvider(url: string): AudioProvider | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  for (const provider of Object.keys(PROVIDER_HOSTS) as AudioProvider[]) {
    if (PROVIDER_HOSTS[provider].some((suffix) => hostMatches(host, suffix))) {
      return provider;
    }
  }
  return null;
}

/** `true` se a URL é de um provedor de áudio aceito. */
export function isAllowedAudioUrl(url: string): boolean {
  return audioProvider(url) !== null;
}
