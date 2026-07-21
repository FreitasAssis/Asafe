"use client";

import { useRouter } from "next/navigation";
import type { LiturgyContext } from "@asafe/core";
import { Breadcrumb } from "./breadcrumb";
import { LiturgyHeader } from "./liturgy-header";

/**
 * Página "Liturgia diária": as leituras do dia (celebração, tempo, cor + texto ao
 * vivo, © CNBB), com um seletor de data para ver outro dia. Reusa o LiturgyHeader
 * (o mesmo do repertório de Missa), aqui já expandido.
 */
export function DailyLiturgyView({
  date,
  liturgy,
}: {
  readonly date: string;
  readonly liturgy: LiturgyContext | null;
}) {
  const router = useRouter();

  return (
    <main className="mx-auto my-8 max-w-2xl px-4">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Liturgia diária" }]} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Liturgia diária</h1>
        <label className="flex items-center gap-2 text-sm text-muted">
          Data
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && router.push(`/liturgia?date=${e.target.value}`)}
            className="input"
          />
        </label>
      </div>

      {liturgy ? (
        <LiturgyHeader liturgy={liturgy} defaultOpen />
      ) : (
        <p className="mt-4 text-muted">
          Não foi possível carregar a liturgia de {date}. Tente outra data ou recarregue.
        </p>
      )}
    </main>
  );
}
