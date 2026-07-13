import { useEffect } from "react";

type WakeLock = { release: () => Promise<void> };
type WakeNavigator = Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };

/**
 * Mantém a tela acesa enquanto o componente está montado (best-effort — se o navegador não
 * suportar wake lock, segue sem). Reativa ao voltar o foco. Usado nos modos de apresentação.
 */
export function useWakeLock() {
  useEffect(() => {
    const nav = navigator as WakeNavigator;
    let lock: WakeLock | null = null;
    const request = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        /* sem wake lock: tudo bem */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
}
