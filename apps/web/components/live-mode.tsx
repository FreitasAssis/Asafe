"use client";

import { useEffect, useRef, useState } from "react";
import { arrangeRepertoire } from "@asafe/core";
import { stripChords, toHtml, transpose } from "@asafe/chordpro";
import type { SharedPackage } from "./public-repertoire";

type WakeLock = { release: () => Promise<void> };
type WakeNavigator = Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };

/**
 * Modo "Ao vivo" (B1): tela cheia escura para o músico tocar o repertório música a música.
 * Fonte grande, alto contraste; autoscroll com velocidade, capo (formas transpostas, separado
 * do tom por ocorrência), esconder cifra, e wake lock para a tela não apagar. Ver DESIGN §7.
 */
export function LiveMode({ pkg, backHref }: { readonly pkg: SharedPackage; readonly backHref: string }) {
  // Ordem de execução = ordem do arranjo (mesma da leitura), achatada em lista linear.
  const arranged = arrangeRepertoire(pkg.slots, pkg.items);
  const items = [...arranged.slots.flatMap((s) => s.items), ...arranged.unslotted];

  const [idx, setIdx] = useState(0);
  const [capo, setCapo] = useState(0);
  const [hide, setHide] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [font, setFont] = useState(1.6);
  const contentRef = useRef<HTMLDivElement>(null);

  const item = items[idx];

  // Cifra exibida: tom soante (transpose do item) e, se houver capo, as FORMAS descem `capo`
  // semitons (o violonista toca mais fácil); "esconder cifra" cai no stripChords.
  let body = item?.chordpro ?? "";
  if (body.trim()) body = transpose(body, (item?.transpose ?? 0) - capo);
  if (hide) body = stripChords(body);
  const html = body.trim() ? toHtml(body) : "";

  // Wake lock: pede ao entrar e ao voltar o foco; solta ao sair.
  useEffect(() => {
    const nav = navigator as WakeNavigator;
    let lock: WakeLock | null = null;
    const request = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        /* sem wake lock (navegador/permite): tudo bem, segue sem */
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

  // Autoscroll: rola o conteúdo enquanto ligado; a velocidade escala px/frame.
  useEffect(() => {
    if (!scrolling) return;
    let raf = 0;
    const step = () => {
      contentRef.current?.scrollBy(0, speed * 0.4);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scrolling, speed]);

  // Trocar de música: volta ao topo e pausa o autoscroll.
  function go(delta: number) {
    setIdx((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
    setScrolling(false);
    contentRef.current?.scrollTo(0, 0);
  }

  // Setas do teclado navegam (útil no tablet com teclado / operador).
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

  if (items.length === 0) {
    return (
      <div className="live-mode">
        <div className="live-bar">
          <span className="flex-1">{pkg.repertoire.title}</span>
          <a href={backHref} aria-label="Sair" className="live-exit">✕</a>
        </div>
        <div className="live-content">Este repertório ainda não tem músicas.</div>
      </div>
    );
  }

  return (
    <div className="live-mode">
      <div className="live-bar">
        <span className="flex-1 truncate">{pkg.repertoire.title}</span>
        <span className="live-pos">{idx + 1}/{items.length}</span>
        <a href={backHref} aria-label="Sair" className="live-exit">✕</a>
      </div>

      <div ref={contentRef} className="live-content">
        <h2 className="live-title">
          {item?.title}
          {capo > 0 && <span className="live-capo">Capo {capo}</span>}
        </h2>
        {item?.composer && <div className="live-composer">{item.composer}</div>}
        {html ? (
          <div className="live-cifra" style={{ fontSize: `${font}rem` }}>
            <div className="chord-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <p className="live-empty">— cifra não disponível (referência)</p>
        )}
      </div>

      <div className="live-controls">
        <button type="button" onClick={() => go(-1)} disabled={idx === 0} aria-label="Anterior">←</button>
        <button type="button" onClick={() => go(1)} disabled={idx === items.length - 1} aria-label="Próxima">→</button>

        <span className="live-group">
          capo
          <button type="button" onClick={() => setCapo((c) => Math.max(0, c - 1))} aria-label="Capo −">−</button>
          <span className="live-num">{capo}</span>
          <button type="button" onClick={() => setCapo((c) => Math.min(11, c + 1))} aria-label="Capo +">+</button>
        </span>

        <button type="button" onClick={() => setScrolling((s) => !s)} aria-label={scrolling ? "Pausar autoscroll" : "Autoscroll"}>
          {scrolling ? "⏸" : "⏵"}
        </button>
        <input
          type="range"
          min={1}
          max={8}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          aria-label="Velocidade do autoscroll"
        />

        <span className="live-group">
          A
          <button type="button" onClick={() => setFont((f) => Math.max(1, +(f - 0.15).toFixed(2)))} aria-label="Fonte menor">−</button>
          <button type="button" onClick={() => setFont((f) => Math.min(3, +(f + 0.15).toFixed(2)))} aria-label="Fonte maior">+</button>
        </span>

        <label className="live-hide">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> esconder cifra
        </label>
      </div>
    </div>
  );
}
