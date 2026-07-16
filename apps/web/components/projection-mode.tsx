"use client";

import { useEffect, useState } from "react";
import { arrangeRepertoire } from "@asafe/core";
import { stripChords } from "@asafe/chordpro";
import { useWakeLock } from "@/lib/use-wake-lock";
import { useLiveSync } from "@/lib/use-live-sync";
import type { SharedPackage } from "./public-repertoire";

/** Letra limpa (sem acordes e sem diretivas `{…}`) em linhas — para o telão. */
function lyricLines(body: string): string[] {
  return stripChords(body)
    .split("\n")
    .map((l) => l.replace(/\{[^}]*\}/g, "").replace(/\s+$/, ""));
}

/**
 * Modo projeção (B2): joga a LETRA num telão/TV para a assembleia acompanhar — grande,
 * limpa, sem cifra. Navega entre as músicas do repertório (setas/teclado); os controles
 * somem sozinhos para a tela ficar limpa. Ver DESIGN §7.
 */
export function ProjectionMode({
  pkg,
  backHref,
  repertoireId,
  userId,
  userName,
}: {
  readonly pkg: SharedPackage;
  readonly backHref: string;
  readonly repertoireId: string;
  readonly userId: string;
  readonly userName: string;
}) {
  const arranged = arrangeRepertoire(pkg.slots, pkg.items);
  const items = [...arranged.slots.flatMap((s) => s.items), ...arranged.unslotted];

  const [idx, setIdx] = useState(0);
  const [showUI, setShowUI] = useState(true);
  useWakeLock();

  // B3: o telão é um SEGUIDOR silencioso — entra no canal e acompanha a música do mestre,
  // sem nenhum controle de sincronia na tela. Nunca comanda; navega manual só se não houver mestre.
  useLiveSync({
    repertoireId,
    enabled: true,
    userId,
    name: userName,
    state: { idx },
    onRemote: ({ idx: rIdx }) => {
      setIdx(Math.min(items.length - 1, Math.max(0, rIdx)));
    },
  });

  const item = items[idx];
  const lines = item ? lyricLines(item.chordpro ?? "") : [];
  const hasLyrics = lines.some((l) => l.trim());

  function go(delta: number) {
    setIdx((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
  }

  // Setas navegam; Esc sai.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") window.location.assign(backHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Controles/legenda somem após inatividade (tela limpa para a assembleia).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const ping = () => {
      setShowUI(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowUI(false), 3000);
    };
    ping();
    window.addEventListener("pointermove", ping);
    window.addEventListener("keydown", ping);
    window.addEventListener("touchstart", ping);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", ping);
      window.removeEventListener("keydown", ping);
      window.removeEventListener("touchstart", ping);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="projection-mode">
        <div className="projection-stage">Este repertório ainda não tem músicas.</div>
      </div>
    );
  }

  return (
    <div className={`projection-mode${showUI ? "" : " projection-idle"}`}>
      <div className="projection-bar">
        <span className="truncate">{item?.title}</span>
        <span className="projection-pos">{idx + 1}/{items.length}</span>
        <a href={backHref} aria-label="Sair" className="projection-exit">✕</a>
      </div>

      <div className="projection-stage">
        {hasLyrics ? (
          <div className="projection-lyrics">
            {lines.map((l, i) =>
              l.trim() ? <p key={i}>{l}</p> : <div key={i} className="projection-gap" aria-hidden />,
            )}
          </div>
        ) : (
          <p className="projection-empty">— sem letra disponível</p>
        )}
      </div>

      <div className="projection-nav">
        <button type="button" onClick={() => go(-1)} disabled={idx === 0} aria-label="Anterior">←</button>
        <button type="button" onClick={() => go(1)} disabled={idx === items.length - 1} aria-label="Próxima">→</button>
      </div>
    </div>
  );
}
