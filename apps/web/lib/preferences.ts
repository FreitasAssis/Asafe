/**
 * Preferências locais do usuário (cookie `asafe_prefs`). Sem DB por ora — quando fizer
 * sentido sincronizar entre aparelhos, troca-se só o "armazém" aqui.
 */
export const PREFS_COOKIE = "asafe_prefs";

export type ThemePref = "light" | "dark";

export interface Prefs {
  /** Ausente = segue o sistema; definido = escolha fixada pelo usuário. */
  theme?: ThemePref;
  /** Default do toggle "esconder cifra" nas visualizações. */
  hideChords?: boolean;
  /** Boas-vindas (história do nome) já dispensadas. */
  welcomeDismissed?: boolean;
}

/** Parse tolerante (server ou client). Valores inválidos viram ausência. */
export function parsePrefs(raw: string | undefined | null): Prefs {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      theme: o.theme === "light" || o.theme === "dark" ? o.theme : undefined,
      hideChords: typeof o.hideChords === "boolean" ? o.hideChords : undefined,
      welcomeDismissed: typeof o.welcomeDismissed === "boolean" ? o.welcomeDismissed : undefined,
    };
  } catch {
    return {};
  }
}

/** Lê o cookie no client (document.cookie). No server retorna {}. */
export function readPrefs(): Prefs {
  if (typeof document === "undefined") return {};
  const raw = document.cookie.match(/(?:^|; )asafe_prefs=([^;]*)/)?.[1];
  return parsePrefs(raw ? decodeURIComponent(raw) : null);
}

/** Grava um patch das preferências no cookie (client). Retorna o estado final. */
export function writePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...readPrefs(), ...patch };
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=${oneYear}; samesite=lax`;
  return next;
}
