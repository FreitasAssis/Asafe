"use client";

import { startTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Error boundary global (App Router): captura qualquer exceção de server component de
 * qualquer tela e, em vez da tela branca crua do Next, mostra algo amigável.
 *
 * Como a maioria dessas falhas é passageira (o soluço de rede na primeira request depois de
 * um cold start do Worker), tentamos renderizar de novo **uma vez** automaticamente — aí o
 * Worker já está quente e costuma passar. Se falhar de novo, paramos de auto-tentar (guarda
 * por tempo, em escopo de módulo, sobrevive ao remount do boundary) e deixamos o botão manual.
 */
let lastAutoRetry = 0;

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const router = useRouter();

  // `reset()` sozinho só re-renderiza o boundary no cliente; para re-executar o server
  // component (e re-buscar os dados que falharam) é preciso `router.refresh()` junto.
  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  useEffect(() => {
    console.error("Erro capturado pelo boundary:", error.digest ?? error.message, error);
    const now = Date.now();
    if (now - lastAutoRetry > 10_000) {
      lastAutoRetry = now;
      retry();
    }
  }, [error, retry]);

  return (
    <main
      style={{
        maxWidth: 440,
        margin: "20vh auto",
        padding: "0 1.5rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo não carregou</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
        Pode ter sido um tropeço momentâneo. Tentamos de novo automaticamente — se continuar,
        toque abaixo.
      </p>
      <button type="button" className="btn" onClick={retry}>
        Tentar de novo
      </button>
    </main>
  );
}
