"use client";

import { useEffect, useRef, useState } from "react";
import { arrangeRepertoire } from "@asafe/core";
import { hasChorus, stripChords, toHtml, transpose } from "@asafe/chordpro";
import { useWakeLock } from "@/lib/use-wake-lock";
import { useLiveSync } from "@/lib/use-live-sync";
import type { SharedPackage } from "./public-repertoire";

/** Persiste as preferências de exibição do Ao vivo (#85) — fonte, velocidade, esconder cifra. */
function savePrefs(patch: { font?: number; speed?: number; hide?: boolean }) {
  try {
    const cur = JSON.parse(localStorage.getItem("asafe.live.prefs") ?? "{}");
    localStorage.setItem("asafe.live.prefs", JSON.stringify({ ...cur, ...patch }));
  } catch {
    // storage indisponível — ignora
  }
}

/**
 * Modo "Ao vivo" (B1): tela cheia escura para o músico tocar o repertório música a música.
 * Fonte grande, alto contraste; navegação (+ ir ao refrão / voltar ao início), autoscroll com
 * velocidade, transpor o tom da sessão, esconder cifra, e wake lock. Ver DESIGN §7.
 * B3: navegação sincronizada opcional (👥) — um mestre empurra a música pros seguidores.
 */
export function LiveMode({
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
  // "Palco limpo": a barra inferior (dock) se auto-esconde; ajustes (tom/fonte/esconder) num painel.
  const [dock, setDock] = useState(true);
  const [settings, setSettings] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false); // nota/observação da música (balão 💬)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ptr = useRef({ x: 0, y: 0, t: 0 });
  // B3: navegação sincronizada (opcional). `sync` liga; `syncPanel` abre as ações do 👥.
  const [sync, setSync] = useState(false);
  const [syncPanel, setSyncPanel] = useState(false);
  // B3.2: âncora de seção = índice do parágrafo no topo. O mestre transmite; o seguidor rola até lá.
  const [anchor, setAnchor] = useState(0);
  const lastAnchor = useRef(0);

  // Aplica a música que veio do mestre (sem re-transmitir nem "soltar" o seguidor).
  function applyRemoteIdx(i: number) {
    setIdx(Math.min(items.length - 1, Math.max(0, i)));
    setScrolling(false);
    setChorusReturn(null);
    setTom(0);
    setAnchor(0);
    setNoteOpen(false);
    contentRef.current?.scrollTo(0, 0);
  }

  // Rola até o parágrafo `k` (âncora de seção). Cada aparelho resolve no próprio layout.
  function scrollToParagraph(k: number) {
    const el = contentRef.current;
    if (!el) return;
    const paras = el.querySelectorAll<HTMLElement>(".chord-preview .paragraph");
    const target = paras[k];
    if (!target) return;
    el.scrollTop += target.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
  }

  const live = useLiveSync({
    repertoireId,
    enabled: sync,
    userId,
    name: userName,
    state: { idx, anchor },
    onRemote: ({ idx: rIdx, anchor: rAnchor }) => {
      if (rIdx !== idx) applyRemoteIdx(rIdx);
      else if (rAnchor != null) scrollToParagraph(rAnchor);
    },
  });

  // Mestre: ao rolar, transmite o parágrafo no topo (com throttle) — a seção que todos seguem.
  function onScroll() {
    if (!(sync && live.isMaster)) return;
    const now = Date.now();
    if (now - lastAnchor.current < 250) return;
    lastAnchor.current = now;
    const el = contentRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const paras = [...el.querySelectorAll<HTMLElement>(".chord-preview .paragraph")];
    let cur = 0;
    for (let i = 0; i < paras.length; i++) {
      const p = paras[i];
      if (p && p.getBoundingClientRect().top - top <= 13) cur = i;
      else break;
    }
    setAnchor((a) => (a === cur ? a : cur));
  }

  const item = items[idx];
  const songHasChorus = hasChorus(item?.chordpro ?? "");

  // Cifra exibida: tom do item + a transposição da sessão (`tom`); "esconder cifra" → stripChords.
  let body = item?.chordpro ?? "";
  if (body.trim()) body = transpose(body, (item?.transpose ?? 0) + tom);
  if (hide) body = stripChords(body);
  const html = body.trim() ? toHtml(body) : "";

  useWakeLock(); // mantém a tela acesa durante a celebração

  // Preferências de exibição (#85): carrega os defaults salvos ao abrir; persiste ao mudar.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("asafe.live.prefs");
      if (!raw) return;
      const pref = JSON.parse(raw) as { font?: number; speed?: number; hide?: boolean };
      if (typeof pref.font === "number") setFont(pref.font);
      if (typeof pref.speed === "number") setSpeed(pref.speed);
      if (typeof pref.hide === "boolean") setHide(pref.hide);
    } catch {
      // storage indisponível/corrompido — segue com os defaults
    }
  }, []);

  function changeFont(delta: number) {
    const v = Math.min(3, Math.max(1, +(font + delta).toFixed(2)));
    setFont(v);
    savePrefs({ font: v });
  }
  function changeSpeed(v: number) {
    setSpeed(v);
    savePrefs({ speed: v });
  }
  function toggleHide(v: boolean) {
    setHide(v);
    savePrefs({ hide: v });
  }

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
    // Seguidor que navega sozinho se solta do mestre (leitura livre).
    if (sync && live.following && !live.isMaster) live.detach();
    setIdx((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
    setScrolling(false);
    setChorusReturn(null);
    setTom(0);
    setAnchor(0);
    setNoteOpen(false);
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

  // Mostra a barra inferior e agenda o auto-esconder (~4s parado).
  function bumpDock() {
    setDock(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setDock(false), 4000);
  }

  // Gestos na área da cifra: arrastar p/ o lado troca de música; tocar mostra/esconde a barra.
  function onPointerDown(e: React.PointerEvent) {
    ptr.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  }
  function onPointerUp(e: React.PointerEvent) {
    const dx = e.clientX - ptr.current.x;
    const dy = e.clientY - ptr.current.y;
    const dt = e.timeStamp - ptr.current.t;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      go(dx < 0 ? 1 : -1); // arrasta p/ esquerda = próxima; p/ direita = anterior
      return;
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) {
      if (settings || syncPanel) {
        setSettings(false); // um toque fecha os painéis abertos
        setSyncPanel(false);
      } else if (dock) setDock(false);
      else bumpDock();
    }
  }

  // Ao entrar e ao trocar de música, mostra a barra por alguns segundos e depois esconde.
  useEffect(() => {
    bumpDock();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

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

  const plural = live.count === 1 ? "" : "s";
  const peersLabel = live.peers.length > 0 ? live.peers.join(", ") : `${live.count} conectado${plural}`;

  // Texto curto do status de sincronia (evita ternário aninhado no JSX).
  let syncStatus = "";
  if (sync) {
    if (live.isMaster) syncStatus = `Você comanda · ${live.count}`;
    else if (!live.masterName) syncStatus = `Ninguém comandando · ${live.count}`;
    else if (live.following) syncStatus = `Seguindo ${live.masterName} · ${live.count}`;
    else syncStatus = "Leitura livre";
  }

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
        <button
          type="button"
          className={`live-gear${syncPanel ? " on" : ""}${sync ? " live-sync-on" : ""}`}
          onClick={() => {
            setSyncPanel((s) => !s);
            setSettings(false);
          }}
          aria-label="Sincronizar"
          aria-expanded={syncPanel}
        >
          👥
        </button>
        <button
          type="button"
          className={`live-gear${settings ? " on" : ""}`}
          onClick={() => {
            setSettings((s) => !s);
            setSyncPanel(false);
          }}
          aria-label="Ajustes"
          aria-expanded={settings}
        >
          ⚙
        </button>
        <a href={backHref} aria-label="Sair" className="live-exit">✕</a>
      </div>

      {/* Status curto de sincronia — sempre visível quando ligada (o telão de Projeção não mostra). */}
      {sync && (
        <div className="live-syncbar">
          <span>{syncStatus}</span>
          {!live.isMaster && live.masterName && !live.following && (
            <button type="button" onClick={live.resync}>Voltar a seguir</button>
          )}
        </div>
      )}

      {/* Ações de sincronia (👥): ligar/desligar e assumir o comando. */}
      {syncPanel && (
        <div className="live-settings live-sync-panel">
          <label className="live-hide">
            <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} /> Sincronizar
          </label>
          {sync && (
            <>
              <span className="live-num" style={{ minWidth: 0 }}>{peersLabel}</span>
              {live.isMaster ? (
                <span className="live-num" style={{ minWidth: 0 }}>Você comanda</span>
              ) : (
                <button type="button" onClick={live.claim}>Assumir comando</button>
              )}
              {!live.isMaster && live.masterName && !live.following && (
                <button type="button" onClick={live.resync}>Voltar a seguir</button>
              )}
            </>
          )}
        </div>
      )}

      {/* Ajustes feitos antes de tocar: tom, fonte e esconder cifra. Painel no topo (fixo). */}
      {settings && (
        <div className="live-settings">
          <span className="live-group">
            tom
            <button type="button" onClick={() => setTom((v) => Math.max(-11, v - 1))} aria-label="Tom −">−</button>
            <span className="live-num">{tom > 0 ? `+${tom}` : tom}</span>
            <button type="button" onClick={() => setTom((v) => Math.min(11, v + 1))} aria-label="Tom +">+</button>
          </span>
          <span className="live-group">
            fonte
            <button type="button" onClick={() => changeFont(-0.15)} aria-label="Fonte menor">A−</button>
            <button type="button" onClick={() => changeFont(0.15)} aria-label="Fonte maior">A+</button>
          </span>
          <label className="live-hide">
            <input type="checkbox" checked={hide} onChange={(e) => toggleHide(e.target.checked)} /> esconder cifra
          </label>
        </div>
      )}

      <div
        ref={contentRef}
        className="live-content"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onScroll={onScroll}
      >
        <h2 className="live-title">
          {item?.title}
          {item?.notes && (
            <button
              type="button"
              className="live-note-btn"
              onClick={() => setNoteOpen((o) => !o)}
              aria-label={noteOpen ? "Esconder observação" : "Ver observação"}
              aria-expanded={noteOpen}
            >
              💬
            </button>
          )}
          {tom !== 0 && <span className="live-tom">tom {tom > 0 ? `+${tom}` : tom}</span>}
        </h2>
        {item?.composer && <div className="live-composer">{item.composer}</div>}
        {noteOpen && item?.notes && <div className="live-note">{item.notes}</div>}
        {html ? (
          <div className="live-cifra" style={{ fontSize: `${font}rem` }}>
            <div className="chord-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <p className="live-empty">— cifra não disponível (referência)</p>
        )}
      </div>

      {/* Navegação nas laterais: transparente p/ não atrapalhar (também dá p/ arrastar a cifra). */}
      <button
        type="button"
        className="live-edge live-edge-left"
        onClick={() => go(-1)}
        disabled={idx === 0}
        aria-label="Anterior"
      >
        ‹
      </button>
      <button
        type="button"
        className="live-edge live-edge-right"
        onClick={() => go(1)}
        disabled={idx === items.length - 1}
        aria-label="Próxima"
      >
        ›
      </button>

      {/* Barra que se auto-esconde (~4s): refrão, início e autoscroll. Toque na cifra revela. */}
      <div className={`live-dock${dock ? "" : " hidden"}`} onPointerDown={bumpDock}>
        <button
          type="button"
          className="live-refrao"
          onClick={toggleChorus}
          disabled={!songHasChorus}
          aria-hidden={!songHasChorus}
          style={songHasChorus ? undefined : { visibility: "hidden" }}
          aria-label={chorusReturn !== null ? "Voltar" : "Ir ao refrão"}
        >
          {chorusReturn !== null ? "↩ Voltar" : "Refrão"}
        </button>
        <button type="button" onClick={toStart} aria-label="Voltar ao início">⤒ Início</button>
        <span className="live-group">
          <button type="button" onClick={() => setScrolling((s) => !s)} aria-label={scrolling ? "Pausar autoscroll" : "Autoscroll"}>
            {scrolling ? "⏸" : "⏵"}
          </button>
          <input
            type="range"
            min={1}
            max={10}
            value={speed}
            onChange={(e) => changeSpeed(Number(e.target.value))}
            aria-label="Velocidade do autoscroll"
          />
        </span>
      </div>
    </div>
  );
}
