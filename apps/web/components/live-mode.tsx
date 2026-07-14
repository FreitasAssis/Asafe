"use client";

import { useEffect, useRef, useState } from "react";
import { arrangeRepertoire } from "@asafe/core";
import { hasChorus, stripChords, toHtml, transpose } from "@asafe/chordpro";
import { useWakeLock } from "@/lib/use-wake-lock";
import type { SharedPackage } from "./public-repertoire";

/**
 * Modo "Ao vivo" (B1): tela cheia escura para o músico tocar o repertório música a música.
 * Fonte grande, alto contraste; navegação (+ ir ao refrão / voltar ao início), autoscroll com
 * velocidade, transpor o tom da sessão, esconder cifra, e wake lock. Ver DESIGN §7.
 */
export function LiveMode({ pkg, backHref }: { readonly pkg: SharedPackage; readonly backHref: string }) {
  // Ordem de execução = ordem do arranjo (mesma da leitura), achatada em lista linear.
  const arranged = arrangeRepertoire(pkg.slots, pkg.items);
  const items = [...arranged.slots.flatMap((s) => s.items), ...arranged.unslotted];

  const [idx, setIdx] = useState(0);
  const [tom, setTom] = useState(0); // transposição da sessão (semitons; + sobe, − desce)
  const [hide, setHide] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [font, setFont] = useState(1.6);
  // Refrão (C10 de apresentação): posição p/ onde voltar após pular pro refrão (null = não pulou).
  const [chorusReturn, setChorusReturn] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const item = items[idx];
  const songHasChorus = hasChorus(item?.chordpro ?? "");

  // Cifra exibida: tom do item + a transposição da sessão (`tom`); "esconder cifra" → stripChords.
  let body = item?.chordpro ?? "";
  if (body.trim()) body = transpose(body, (item?.transpose ?? 0) + tom);
  if (hide) body = stripChords(body);
  const html = body.trim() ? toHtml(body) : "";

  useWakeLock(); // mantém a tela acesa durante a celebração

  // Autoscroll: rola por TEMPO (px/s) com acumulador sub-pixel — assim velocidades bem baixas
  // rolam suave. Escala: speed 1 = 8px/s (bem lento, p/ músicas lentas) … 10 = 80px/s.
  useEffect(() => {
    if (!scrolling) return;
    const el = contentRef.current;
    if (!el) return;
    const pxPerSec = speed * 8;
    let raf = 0;
    let last = 0;
    let acc = 0;
    const step = (t: number) => {
      if (last) {
        acc += (pxPerSec * (t - last)) / 1000;
        const whole = Math.floor(acc);
        if (whole > 0) {
          el.scrollTop += whole;
          acc -= whole;
        }
      }
      last = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scrolling, speed]);

  // Trocar de música: volta ao topo, pausa o autoscroll e zera tom/refrão da sessão.
  function go(delta: number) {
    setIdx((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
    setScrolling(false);
    setChorusReturn(null);
    setTom(0);
    contentRef.current?.scrollTo(0, 0);
  }

  // Voltar ao começo da música.
  function toStart() {
    setChorusReturn(null);
    contentRef.current?.scrollTo({ top: 0 });
  }

  // Pula pro refrão (guardando de onde veio); no toque seguinte, volta pra lá.
  function toggleChorus() {
    const el = contentRef.current;
    if (!el) return;
    if (chorusReturn !== null) {
      el.scrollTop = chorusReturn;
      setChorusReturn(null);
      return;
    }
    const chorus = el.querySelector<HTMLElement>(".chorus");
    if (!chorus) return;
    setScrolling(false); // não brigar com o autoscroll
    setChorusReturn(el.scrollTop);
    el.scrollTop += chorus.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
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
          {tom !== 0 && <span className="live-tom">tom {tom > 0 ? `+${tom}` : tom}</span>}
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
        {songHasChorus && (
          <button type="button" onClick={toggleChorus} aria-label={chorusReturn !== null ? "Voltar" : "Ir ao refrão"}>
            {chorusReturn !== null ? "↩ Voltar" : "Refrão"}
          </button>
        )}
        <button type="button" onClick={toStart} aria-label="Voltar ao início">⤒ Início</button>

        <span className="live-group">
          tom
          <button type="button" onClick={() => setTom((v) => Math.max(-11, v - 1))} aria-label="Tom −">−</button>
          <span className="live-num">{tom > 0 ? `+${tom}` : tom}</span>
          <button type="button" onClick={() => setTom((v) => Math.min(11, v + 1))} aria-label="Tom +">+</button>
        </span>

        <span className="live-group">
          <button type="button" onClick={() => setScrolling((s) => !s)} aria-label={scrolling ? "Pausar autoscroll" : "Autoscroll"}>
            {scrolling ? "⏸" : "⏵"}
          </button>
          <input
            type="range"
            min={1}
            max={10}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Velocidade do autoscroll"
          />
        </span>

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
