"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/musicas", label: "Catálogo" },
  { href: "/repertorios", label: "Repertórios" },
  { href: "/grupos", label: "Grupos" },
] as const;

/** Sidebar das páginas logadas: fixa no desktop, gaveta com ☰ no mobile. */
export function Sidebar({ userName }: { readonly userName: string }) {
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
        <a href="/" className="app-brand" style={{ padding: 0 }}>
          Asafe 🎵
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
        <a href="/" className="app-brand" onClick={() => setOpen(false)}>
          Asafe 🎵
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
        <div className="app-sidebar-footer">
          <div style={{ marginBottom: 8, color: "#333", fontWeight: 600 }}>{userName}</div>
          <button type="button" onClick={() => void signOut()} style={{ padding: "6px 10px" }}>
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
