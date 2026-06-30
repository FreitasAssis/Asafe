"use client";

import { useEffect, useState } from "react";
import { writePrefs, type ThemePref } from "@/lib/preferences";

/** Alterna claro/escuro: aplica no <html> na hora e fixa a escolha no cookie. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePref | null>(null);

  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme");
    setTheme(cur === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: ThemePref = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    writePrefs({ theme: next });
    setTheme(next);
  }

  const label = theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-base hover:bg-surface"
    >
      {theme === null ? "" : theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
