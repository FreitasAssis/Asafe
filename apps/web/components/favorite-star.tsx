"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { setRepertoireFavorite } from "@/lib/repertoires";

/**
 * Estrela de favorito (pessoal, por usuário). Toggle: ★ favoritado → clica e remove; ☆ vazia →
 * clica e adiciona. Atualização otimista + `router.refresh()` para a seção Favoritos da home
 * refletir na hora. A RLS garante que cada um só mexe no próprio favorito.
 */
export function FavoriteStar({
  repertoireId,
  userId,
  initialFavorite,
  className = "",
}: {
  readonly repertoireId: string;
  readonly userId: string;
  readonly initialFavorite: boolean;
  readonly className?: string;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !fav;
    setFav(next); // otimista
    setBusy(true);
    try {
      await setRepertoireFavorite(browserClient(), userId, repertoireId, next);
      router.refresh();
    } catch {
      setFav(!next); // reverte se falhar
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={fav}
      aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={fav ? "Remover dos favoritos" : "Favoritar"}
      className={`shrink-0 leading-none transition-colors disabled:opacity-50 ${
        fav ? "text-yellow-500" : "text-muted hover:text-yellow-500"
      } ${className}`}
    >
      <span aria-hidden className="text-lg">
        {fav ? "★" : "☆"}
      </span>
    </button>
  );
}
