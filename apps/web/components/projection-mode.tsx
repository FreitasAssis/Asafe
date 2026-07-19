"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { arrangeRepertoire, liturgicalColorHex } from "@asafe/core";
import { lyricParagraphs } from "@asafe/chordpro";
import { useWakeLock } from "@/lib/use-wake-lock";
import type { SharedPackage } from "./public-repertoire";

interface Slide {
  songIdx: number;
  title: string;
  lines: string[];
  chorus: boolean;
}

/**
 * Modo projeção (B2): a LETRA num telão/TV para a assembleia, grande e limpa (sem cifra).
 *
 * Apresentação em **slides**: cada slide é uma **estrofe inteira** ou o **refrão inteiro**
 * (um parágrafo). ← → navegam **dentro da música** (não pulam de música sem querer); há botão
 * **Refrão** (pula pro refrão e volta) e, na última estrofe, **Próxima música**. **Operação
 * manual** (setas/teclado); a Projeção não entra na sincronia do Ao vivo. Ver DESIGN §7.
 */
export function ProjectionMode({
  pkg,
  backHref,
}: {
  readonly pkg: SharedPackage;
  readonly backHref: string;
}) {
  // Detalhe litúrgico: filete no topo na cor do dia (Missa resolvida).
  const litColor = liturgicalColorHex(pkg.repertoire.liturgicalSnapshot?.color ?? null);
  const litBorder = litColor ? { borderTop: `3px solid ${litColor}` } : undefined;
  const slides = useMemo<Slide[]>(() => {
    const arranged = arrangeRepertoire(pkg.slots, pkg.items);
    const items = [...arranged.slots.flatMap((s) => s.items), ...arranged.unslotted];
    // Cada música vira um ou mais slides (um por estrofe/refrão). Sem letra (referência) → 1 slide.
    return items.flatMap((it, songIdx) => {
      const paras = lyricParagraphs(it.chordpro ?? "");
      return paras.length > 0
        ? paras.map((p) => ({ songIdx, title: it.title, lines: p.lines, chorus: p.chorus }))
        : [{ songIdx, title: it.title, lines: [], chorus: false }];
    });
  }, [pkg]);

  const [s, setS] = useState(0);
  const [chorusReturn, setChorusReturn] = useState<number | null>(null);
  const [showUI, setShowUI] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  useWakeLock();

  const slide = slides[s]!;
  // Fronteiras da música atual (para não cruzar de música sem querer).
  let firstOfSong = s;
  let lastOfSong = s;
  while (firstOfSong > 0 && slides[firstOfSong - 1]!.songIdx === slide.songIdx) firstOfSong--;
  while (lastOfSong < slides.length - 1 && slides[lastOfSong + 1]!.songIdx === slide.songIdx) lastOfSong++;
  const chorusIdx = slides.findIndex((x) => x.songIdx === slide.songIdx && x.chorus);
  const atFirst = s === firstOfSong;
  const atLast = s === lastOfSong;
  const slideInSong = s - firstOfSong + 1;
  const songSlideCount = lastOfSong - firstOfSong + 1;

  // ← → só andam DENTRO da música (usam updater p/ o teclado não pegar `s` velho).
  function back() {
    setChorusReturn(null);
    setS((cur) => {
      const song = slides[cur]!.songIdx;
      let first = cur;
      while (first > 0 && slides[first - 1]!.songIdx === song) first--;
      return cur > first ? cur - 1 : cur;
    });
  }
  function fwd() {
    setChorusReturn(null);
    setS((cur) => {
      const song = slides[cur]!.songIdx;
      let last = cur;
      while (last < slides.length - 1 && slides[last + 1]!.songIdx === song) last++;
      return cur < last ? cur + 1 : cur;
    });
  }
  function toChorus() {
    if (chorusReturn !== null) {
      setS(chorusReturn);
      setChorusReturn(null);
    } else if (chorusIdx >= 0 && s !== chorusIdx) {
      setChorusReturn(s);
      setS(chorusIdx);
    }
  }
  function nextSong() {
    setChorusReturn(null);
    setS(lastOfSong + 1);
  }
  function prevSong() {
    setChorusReturn(null);
    const prev = slides[firstOfSong - 1]!.songIdx;
    let f = firstOfSong - 1;
    while (f > 0 && slides[f - 1]!.songIdx === prev) f--;
    setS(f);
  }
  function restart() {
    setChorusReturn(null);
    setS(firstOfSong);
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
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") fwd();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") back();
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
      <div className="projection-mode" style={litBorder}>
        <div className="projection-stage">Este repertório ainda não tem músicas.</div>
      </div>
    );
  }

  return (
    <div className={`projection-mode${showUI ? "" : " projection-idle"}`} style={litBorder}>
      <div className="projection-bar">
        <span className="truncate">{slide.title}</span>
        <span className="projection-pos">
          {slide.chorus ? "refrão" : `${slideInSong}/${songSlideCount}`}
        </span>
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
        {atFirst && firstOfSong > 0 && (
          <button type="button" className="projection-song-btn" onClick={prevSong}>
            ← Música anterior
          </button>
        )}
        <button type="button" onClick={back} disabled={atFirst} aria-label="Estrofe anterior">←</button>
        {chorusIdx >= 0 && (
          <button
            type="button"
            onClick={toChorus}
            aria-label={chorusReturn !== null ? "Voltar" : "Ir ao refrão"}
          >
            {chorusReturn !== null ? "↩ Voltar" : "Refrão"}
          </button>
        )}
        <button type="button" onClick={fwd} disabled={atLast} aria-label="Próxima estrofe">→</button>
        {atLast && lastOfSong < slides.length - 1 && (
          <button type="button" className="projection-song-btn" onClick={nextSong}>
            Próxima música →
          </button>
        )}
        {atLast && lastOfSong === slides.length - 1 && songSlideCount > 1 && (
          <button type="button" className="projection-song-btn" onClick={restart}>
            ⤒ Início
          </button>
        )}
      </div>
    </div>
  );
}
