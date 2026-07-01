"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/musicas", label: "Catálogo" },
  { href: "/repertorios", label: "Repertórios" },
  { href: "/grupos", label: "Grupos" },
] as const;

/** Sidebar das páginas logadas: fixa no desktop, gaveta com ☰ no mobile. */
export function Sidebar({
  userName,
  isModerator = false,
  moderationCount = 0,
}: {
  readonly userName: string;
  readonly isModerator?: boolean;
  readonly moderationCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="app-topbar">
        <button
          type="button"
          className="app-burger"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
        <a href="/" aria-label="Início">
          <Brand />
        </a>
      </div>

      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        className={`app-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <nav className={`app-sidebar${open ? " open" : ""}`} aria-label="Navegação principal">
        <a href="/" aria-label="Início" className="px-2 pb-3 pt-1" onClick={() => setOpen(false)}>
          <Brand />
        </a>
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="app-navlink"
            aria-current={isActive(l.href) ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </a>
        ))}
        {isModerator && (
          <a
            href="/moderacao"
            className="app-navlink flex items-center justify-between"
            aria-current={isActive("/moderacao") ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span>Moderação</span>
            {moderationCount > 0 && (
              <span
                className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
                style={{ background: "var(--accent)", color: "var(--on-primary)" }}
              >
                {moderationCount}
              </span>
            )}
          </a>
        )}
        <div className="app-sidebar-footer">
          <div className="mb-2 font-semibold text-ink">{userName}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void signOut()} className="btn">
              Sair
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
