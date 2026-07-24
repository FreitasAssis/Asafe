"use client";

import { useEffect, useState } from "react";

/** Evento `beforeinstallprompt` (Chrome/Edge/Android/desktop) — tipo não está no lib DOM. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "asafe.installDismissed";

/** Rodando já instalado (standalone)? Então não há o que oferecer. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** iOS Safari (não Chrome/Firefox no iOS): não dispara beforeinstallprompt → dica manual. */
function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad iPadOS
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome/i.test(ua);
  return iOS && isSafari;
}

/**
 * Nudge de instalação (PWA): botão discreto "Instalar o app" quando o navegador oferece o
 * prompt (Android/desktop), ou uma dica de "Adicionar à Tela de Início" no iOS. Some se já
 * estiver instalado ou se o usuário dispensar (lembra no localStorage). Não é intrusivo:
 * um pill no canto, dispensável.
 */
export function InstallNudge() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "button" | "ios">("hidden");

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // guarda p/ disparar no clique do usuário
      if (localStorage.getItem(DISMISS_KEY)) return; // já dispensou nesta sessão/antes
      setDeferred(e as InstallPromptEvent);
      setMode("button");
    };
    const onInstalled = () => {
      setMode("hidden");
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIOSSafari()) setMode("ios");

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage indisponível — só esconde nesta sessão.
    }
    setMode("hidden");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    setMode("hidden");
  }

  if (mode === "hidden") return null;

  return (
    <aside className="install-nudge" aria-label="Instalar o Asafe">
      {mode === "button" ? (
        <button type="button" className="install-nudge-cta" onClick={() => void install()}>
          📲 Instalar o app
        </button>
      ) : (
        <span className="install-nudge-hint">
          📲 Instalar: <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>
        </span>
      )}
      <button
        type="button"
        className="install-nudge-x"
        aria-label="Dispensar"
        onClick={dismiss}
      >
        ✕
      </button>
    </aside>
  );
}
