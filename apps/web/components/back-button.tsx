"use client";

import { useRouter } from "next/navigation";

/**
 * Volta para a página anterior (login ou tela inicial, conforme de onde veio).
 * Sem histórico (acesso direto), cai em `/` — que leva ao login se deslogado.
 */
export function BackButton() {
  const router = useRouter();

  function back() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button type="button" onClick={back} className="text-sm text-muted hover:text-ink">
      ← Voltar
    </button>
  );
}
