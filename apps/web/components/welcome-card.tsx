"use client";

import { useState } from "react";
import { writePrefs } from "@/lib/preferences";

/** Boas-vindas no 1º acesso: a história do nome, em tom de convite. Dispensável. */
export function WelcomeCard() {
  const [show, setShow] = useState(true);
  if (!show) return null;

  function dismiss() {
    writePrefs({ welcomeDismissed: true });
    setShow(false);
  }

  return (
    <div className="card mb-6 flex items-start gap-3">
      <div className="flex-1">
        <h2 className="mt-0 mb-1 font-serif text-lg font-semibold">Por que “Asafe”?</h2>
        <p className="mb-3 text-muted">
          Asaf foi o levita que o rei Davi pôs à frente do louvor — e a quem se atribuem salmos
          cantados pela assembleia. O nome é um aceno a quem conduz a música da comunidade.
        </p>
        <a href="/sobre" className="link">
          saber mais →
        </a>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        title="Dispensar"
        className="icon-btn"
      >
        ✕
      </button>
    </div>
  );
}
