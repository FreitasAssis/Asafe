"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { arrangeRepertoire } from "@asafe/core";
import { lyricParagraphs } from "@asafe/chordpro";
import { useWakeLock } from "@/lib/use-wake-lock";
import type { SharedPackage } from "./public-repertoire";

interface Slide {
  title: string;
  lines: string[];
}

/**
 * Modo projeção (B2): a LETRA num telão/TV para a assembleia, grande e limpa (sem cifra).
 *
 * Apresentação em **slides**: cada slide é uma **estrofe inteira** ou o **refrão inteiro**
 * (um parágrafo), na ordem das músicas do repertório. **Operação manual** (setas/teclado);
 * a Projeção não entra na sincronia do Ao vivo — quem opera o telão o conduz. Ver DESIGN §7.
 */
export function ProjectionMode({
  pkg,
  backHref,
}: {
  readonly pkg: SharedPackage;
  readonly backHref: string;
}) {
  const slides = useMemo<Slide[]>(() => {
    const arranged = arrangeRepertoire(pkg.slots, pkg.items);
    const items = [...arranged.slots.flatMap((s) => s.items), ...arranged.unslotted];
    // Cada música vira um ou mais slides (um por estrofe/refrão). Sem letra (referência) → 1 slide.
    return items.flatMap((it) => {
      const paras = lyricParagraphs(it.chordpro ?? "");
      return paras.length > 0
        ? paras.map((lines) => ({ title: it.title, lines }))
        : [{ title: it.title, lines: [] }];
    });
  }, [pkg]);

  const [s, setS] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  useWakeLock();

  const slide = slides[s];

  function go(delta: number) {
    setS((i) => Math.min(slides.length - 1, Math.max(0, i + delta)));
  }

  // Fit-to-screen: acha a MAIOR fonte em que o slide (estrofe/refrão) cabe inteiro na tela —
  // sem rolar. Re-mede ao trocar de slide e ao redimensionar. Busca binária no tamanho da fonte.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const el = lyricsRef.current;
    if (!stage || !el) return;
    const fit = () => {
      const cs = getComputedStyle(stage);
      const availH =
        stage.clientHeight - Number.parseFloat(cs.paddingTop) - Number.parseFloat(cs.paddingBottom);
      const availW =
        stage.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight);
      const fits = (px: number) => {
        el.style.fontSize = `${px}px`;
        return el.scrollHeight <= availH && el.scrollWidth <= availW;
      };
      let lo = 16;
      let hi = 220;
      if (fits(hi)) return;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      el.style.fontSize = `${lo}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [s, slides]);

  // Setas navegam entre slides; Esc sai.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Escape") window.location.assign(backHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

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

  if (slides.length === 0) {
    return (
      <div className="projection-mode">
        <div className="projection-stage">Este repertório ainda não tem músicas.</div>
      </div>
    );
  }

  return (
    <div className={`projection-mode${showUI ? "" : " projection-idle"}`}>
      <div className="projection-bar">
        <span className="truncate">{slide?.title}</span>
        <span className="projection-pos">{s + 1}/{slides.length}</span>
        <a href={backHref} aria-label="Sair" className="projection-exit">✕</a>
      </div>

      <div className="projection-stage" ref={stageRef}>
        {slide && slide.lines.length > 0 ? (
          <div className="projection-lyrics" ref={lyricsRef}>
            {slide.lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        ) : (
          <p className="projection-empty">— sem letra disponível</p>
        )}
      </div>

      <div className="projection-nav">
        <button type="button" onClick={() => go(-1)} disabled={s === 0} aria-label="Anterior">←</button>
        <button type="button" onClick={() => go(1)} disabled={s === slides.length - 1} aria-label="Próxima">→</button>
      </div>
    </div>
  );
}
