"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "🎵",
    title: "Catálogo & músicas",
    body: "Cadastre ou cole as cifras das suas músicas. O Asafe guarda em ChordPro, então você transpõe o tom e esconde a cifra quando quiser.",
  },
  {
    icon: "📋",
    title: "Repertórios",
    body: "Monte o repertório por momento da celebração, escolhendo músicas do seu catálogo ou dos seus grupos.",
  },
  {
    icon: "📖",
    title: "Liturgia do dia",
    body: "Numa Missa com data, o Asafe resolve o tempo litúrgico: monta os momentos certos (o Glória some no Advento e na Quaresma), traz o salmo e as leituras do dia — até no Ao vivo e na Projeção. E a Liturgia diária, no menu, mostra as leituras de qualquer data.",
  },
  {
    icon: "🎤",
    title: "Ao vivo & Projeção",
    body: "Toque música a música em tela cheia — transpor, autoscroll, pular pro refrão. No modo sincronizado, um mestre conduz o tom e a música para todos. E a Projeção joga a letra no telão em slides.",
  },
  {
    icon: "👥",
    title: "Grupos",
    body: "Crie grupos e compartilhe repertórios com a sua equipe.",
  },
  {
    icon: "📲",
    title: "Instale na tela inicial",
    body: "Adicione o Asafe à tela inicial para abrir como um app. No iPhone: toque em Compartilhar e depois “Adicionar à Tela de Início”. No Android: menu do navegador → “Instalar app”.",
  },
];

const KEY = "asafe.onboarded";

/**
 * Modal de boas-vindas (#90): no primeiro acesso apresenta o app em passos. Grava um flag no
 * localStorage p/ não reaparecer; reabre a qualquer momento pelo evento `asafe:tour` (item
 * "Ajuda" do menu). Sem dependências e sem acoplar a elementos específicos da tela.
 */
export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  // Não aparece por cima dos modos tela-cheia (Ao vivo / Projeção) — lá não é hora de onboarding.
  const pathname = usePathname();
  const fullscreen = /\/(ao-vivo|projecao)$/.test(pathname ?? "");

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        setI(0);
        setOpen(true);
      }
    } catch {
      // storage indisponível — não mostra automaticamente
    }
    const onTour = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener("asafe:tour", onTour);
    return () => window.removeEventListener("asafe:tour", onTour);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || fullscreen) return null;
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  return (
    <div
      className="tour-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao Asafe"
      onClick={close}
    >
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tour-close" onClick={close} aria-label="Fechar">
          ✕
        </button>
        <div className="tour-icon" aria-hidden>
          {step.icon}
        </div>
        <h2 className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>

        <div className="tour-dots" aria-hidden>
          {STEPS.map((_, k) => (
            <span key={STEPS[k]!.title} className={`tour-dot${k === i ? " on" : ""}`} />
          ))}
        </div>

        <div className="tour-actions">
          {i > 0 ? (
            <button type="button" className="btn" onClick={() => setI(i - 1)}>
              Voltar
            </button>
          ) : (
            <button type="button" className="btn" onClick={close}>
              Pular
            </button>
          )}
          {last ? (
            <button type="button" className="btn btn-primary" onClick={close}>
              Começar
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setI(i + 1)}>
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
