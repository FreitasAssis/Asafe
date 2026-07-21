import { redirect } from "next/navigation";
import { buildSnapshot, liturgyContext, type LiturgyContext } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { resolveForDate } from "@/lib/liturgy/resolve";
import { DailyLiturgyView } from "@/components/daily-liturgy-view";

/** Hoje no fuso do Brasil (a liturgia é resolvida por data civil). */
function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/**
 * Liturgia diária: as leituras do dia (ou de uma data escolhida via `?date=`).
 * Resolve no servidor (mesmo caminho da Missa com data) e degrada com aviso se a
 * fonte cair. Popular o cache aqui é o comportamento esperado (mesmas tabelas).
 */
export default async function LiturgiaDiaria({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date: qs } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(qs ?? "") ? qs! : todaySaoPaulo();

  let liturgy: LiturgyContext | null = null;
  try {
    const resolved = await resolveForDate(date);
    liturgy = liturgyContext(buildSnapshot(resolved));
  } catch (e) {
    console.error(`[liturgia-diaria] resolução falhou para ${date}:`, e);
  }

  return <DailyLiturgyView date={date} liturgy={liturgy} />;
}
