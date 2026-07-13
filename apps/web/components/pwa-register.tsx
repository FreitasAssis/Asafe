"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA nível 1). Sem UI — roda uma vez no cliente. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registro falhou (ex.: modo privado): app segue funcionando sem PWA */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
