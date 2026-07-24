"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildStageSequence, liturgicalColorHex, type ReadingWithText } from "@asafe/core";
import { lyricParagraphs, projectionPlayOrder } from "@asafe/chordpro";
import { useWakeLock } from "@/lib/use-wake-lock";
import { getDayReadingTexts } from "@/lib/liturgy/read-actions";
import { READING_LABELS } from "@/lib/liturgy/reading-labels";
import type { SharedPackage } from "./public-repertoire";

interface Slide {
  songIdx: number;
  title: string;
  lines: string[];
  chorus: boolean;
  /** Slide de leitura (texto litúrgico), não estrofe de música. */
  reading?: boolean;
  /** Rótulo curto p/ os botões de navegação (ex.: "Evangelho"); música = undefined. */
  navLabel?: string;
}

interface SongCycle {
  /** Índices (em `slides`) dos parágrafos desta música, na ordem da fonte. */
  idxs: number[];
  /** Ordem de projeção: índices (em `slides`) com o refrão intercalado; o loop é do caller. */
  cycle: number[];
}

/**
 * Agrupa os slides por música (songIdx), preservando a ordem dos parágrafos, e calcula a
 * ORDEM DE PROJEÇÃO de cada uma (refrão intercalado entre as estrofes). Leituras viram
 * grupos de 1 slide.
 */
function groupSongCycles(slides: Slide[]): SongCycle[] {
  const groups: number[][] = [];
  slides.forEach((sl, i) => {
    const last = groups.at(-1);
    if (last && slides[last[0]!]!.songIdx === sl.songIdx) last.push(i);
    else groups.push([i]);
  });
  return groups.map((idxs) => ({
    idxs,
    cycle: projectionPlayOrder(idxs.map((i) => slides[i]!.chorus)).map((k) => idxs[k]!),
  }));
}

/** "refrão" / "estrofe X/N" / "" (leitura não numera). */
function positionLabel(slide: Slide | undefined, stanzaNo: number, stanzaCount: number): string {
  if (!slide || slide.reading) return "";
  if (slide.chorus) return "refrão";
  return stanzaCount > 1 ? `estrofe ${stanzaNo}/${stanzaCount}` : "";
}

/**
 * Modo projeção (B2): a LETRA num telão/TV para a assembleia, grande e limpa (sem cifra).
 *
 * Apresentação em **slides**: cada slide é uma **estrofe inteira** ou o **refrão inteiro**
 * (um parágrafo). 4 botões fixos: **Anterior · ← · → · Próxima**. `←`/`→` andam **dentro da
 * música** com o **refrão intercalado entre as estrofes**, em loop (só refrão → estrofe →
 * refrão → …; da última estrofe volta ao começo); **Anterior/Próxima** é o único jeito de
 * trocar de música. **Operação manual** (setas/teclado); a Projeção não entra na sincronia do
 * Ao vivo. Ver DESIGN §7.
 */
export function ProjectionMode({
  pkg,
  backHref,
}: {
  readonly pkg: SharedPackage;
  readonly backHref: string;
}) {
  // Detalhe litúrgico: filete no topo na cor do dia (Missa resolvida).
  const snapshot = pkg.repertoire.liturgicalSnapshot ?? null;
  const litColor = liturgicalColorHex(snapshot?.color ?? null);
  const litBorder = litColor ? { borderTop: `3px solid ${litColor}` } : undefined;

  // Textos das leituras: buscados ao vivo (© CNBB, não persistidos), por tipo.
  const [readingTexts, setReadingTexts] = useState<Record<string, ReadingWithText>>({});
  useEffect(() => {
    if (!snapshot?.date) return;
    let alive = true;
    void getDayReadingTexts(snapshot.date).then((rs) => {
      if (alive) setReadingTexts(Object.fromEntries(rs.map((r) => [r.kind, r])));
    });
    return () => {
      alive = false;
    };
  }, [snapshot?.date]);

  const slides = useMemo<Slide[]>(() => {
    // Passos = músicas + leituras na ordem litúrgica (#102). Cada música vira 1+
    // slides (estrofe/refrão); cada leitura vira 1 slide (o texto entra ao carregar).
    const steps = buildStageSequence(pkg.slots, pkg.items, snapshot);
    return steps.flatMap((step, songIdx) => {
      if (step.kind === "reading") {
        const t = readingTexts[step.reading.kind];
        const ref = step.reading.ref ? ` · ${step.reading.ref}` : "";
        const textLines = t ? t.text.split("\n").filter((l) => l.trim()) : [];
        // Salmo: o refrão (resposta cantada) vai junto, no topo — a projeção não
        // separa estrofes, então o salmo fica todo num slide só. Só o salmo tem refrão.
        const lines = t?.refrain ? [`Refrão: ${t.refrain}`, "", ...textLines] : textLines;
        return [
          {
            songIdx,
            title: `${READING_LABELS[step.reading.kind]}${ref}`,
            lines,
            chorus: false,
            reading: true,
            navLabel: READING_LABELS[step.reading.kind],
          },
        ];
      }
      const it = step.item;
      const paras = lyricParagraphs(it.chordpro ?? "");
      return paras.length > 0
        ? paras.map((p) => ({ songIdx, title: it.title, lines: p.lines, chorus: p.chorus }))
        : [{ songIdx, title: it.title, lines: [], chorus: false }];
    });
  }, [pkg, snapshot, readingTexts]);

  const songs = useMemo(() => groupSongCycles(slides), [slides]);

  const [g, setG] = useState(0); // música atual
  const [c, setC] = useState(0); // posição no ciclo da música
  const [showUI, setShowUI] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  useWakeLock();

  // Índices saneados (o array pode mudar quando a leitura carrega; nunca sair do range).
  const gi = songs.length ? Math.min(g, songs.length - 1) : 0;
  const cycle = songs[gi]?.cycle ?? [0];
  const ci = Math.min(c, cycle.length - 1);
  const s = cycle[ci] ?? 0;
  const slide = slides[s];

  // Rótulo de posição: refrão / estrofe X de N (leitura não numera).
  const stanzaIdxs = (songs[gi]?.idxs ?? []).filter((i) => !slides[i]!.chorus && !slides[i]!.reading);
  const posLabel = positionLabel(slide, stanzaIdxs.indexOf(s) + 1, stanzaIdxs.length);

  const hasPrevSong = gi > 0;
  const hasNextSong = gi < songs.length - 1;

  // ← → andam DENTRO da música, em loop pelo ciclo (refrão entre estrofes).
  function back() {
    setC((x) => (x - 1 + cycle.length) % cycle.length);
  }
  function fwd() {
    setC((x) => (x + 1) % cycle.length);
  }
  // Anterior / Próxima cruzam de música (e só isso cruza); param nas pontas do repertório.
  function prevSong() {
    if (hasPrevSong) {
      setG(gi - 1);
      setC(0);
    }
  }
  function nextSong() {
    if (hasNextSong) {
      setG(gi + 1);
      setC(0);
    }
  }

  // Fit-to-screen: acha a MAIOR fonte em que o slide (estrofe/refrão) cabe inteiro na tela —
  // sem rolar. Re-mede ao trocar de slide e ao redimensionar. Busca binária no tamanho da fonte.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const el = lyricsRef.current;
    if (!stage || !el) return;
    const fit = () => {
      // Zera para o mínimo ANTES de medir a área: senão o elemento ainda carrega a fonte
      // do slide anterior e, se transbordar, a barra de rolagem (que ocupa largura em alguns
      // sistemas, ex.: macOS "sempre mostrar") encolhe o clientWidth — a MESMA leitura então
      // media diferente conforme de onde se navegou (às vezes travando no piso de 16px).
      el.style.fontSize = "16px";
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

  // Teclado: ← → dentro da música; ↑/PageUp e ↓/PageDown trocam de música; Esc sai.
  // Depende de gi/songs para os closures pegarem o ciclo e a música atuais.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") fwd();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "ArrowDown" || e.key === "PageDown") nextSong();
      else if (e.key === "ArrowUp" || e.key === "PageUp") prevSong();
      else if (e.key === "Escape") window.location.assign(backHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, songs.length]);

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

  if (!slide) {
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
        <span className="projection-pos">{posLabel}</span>
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
          <p className="projection-empty">
            {slide?.reading ? "carregando a leitura…" : "— sem letra disponível"}
          </p>
        )}
      </div>

      {/* 4 botões fixos: Anterior · < · > · Próxima. Só Anterior/Próxima cruzam de música;
          < e > andam dentro da música (refrão intercalado, em loop). */}
      <div className="projection-nav">
        <button
          type="button"
          className="projection-song-btn"
          onClick={prevSong}
          disabled={!hasPrevSong}
        >
          ← Anterior
        </button>
        <button type="button" onClick={back} aria-label="Voltar (dentro da música)">←</button>
        <button type="button" onClick={fwd} aria-label="Avançar (dentro da música)">→</button>
        <button
          type="button"
          className="projection-song-btn"
          onClick={nextSong}
          disabled={!hasNextSong}
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
