import type { SupabaseClient } from "@supabase/supabase-js";
import { parseReadingRef, segmentsOverlap, type PericopeSegment } from "@asafe/core";

/**
 * Ids de músicas ligadas a QUALQUER leitura do dia (A4, por sobreposição). O
 * sinal mais forte do motor de sugestão (A5): a UI cruza com o catálogo do
 * usuário para marcar quem "combina com a leitura". Server-side.
 */
export async function linkedSongIdsForReadings(
  supabase: SupabaseClient,
  refs: string[],
): Promise<string[]> {
  const segments = refs.flatMap((r) => parseReadingRef(r));
  if (segments.length === 0) return [];

  const { data: segRows } = await supabase
    .from("pericope_segment")
    .select("pericope_id, book, chapter, verse_start, verse_end")
    .in("book", [...new Set(segments.map((s) => s.book))])
    .in("chapter", [...new Set(segments.map((s) => s.chapter))]);

  const matching = new Set<string>();
  for (const row of (segRows ?? []) as {
    pericope_id: string;
    book: string;
    chapter: number;
    verse_start: number;
    verse_end: number;
  }[]) {
    const candidate: PericopeSegment = {
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse_start,
      verseEnd: row.verse_end,
    };
    if (segmentsOverlap(segments, [candidate])) matching.add(row.pericope_id);
  }
  if (matching.size === 0) return [];

  const { data: links } = await supabase
    .from("song_pericope")
    .select("song_id")
    .in("pericope_id", [...matching]);

  return [...new Set(((links ?? []) as { song_id: string }[]).map((l) => l.song_id))];
}

/** Uso de cada música NAQUELE momento (A5 v2): n no momento e n na mesma celebração. */
export interface MomentUsage {
  nMoment: number;
  nAnchor: number;
}

/**
 * Contagens de uso por música para um momento, via RPC `moment_song_usage`
 * (SECURITY INVOKER: a RLS limita ao que o chamador vê — seus + grupos +
 * aprovados). Devolve um mapa songId → {nMoment, nAnchor}.
 */
export async function momentSongUsage(
  supabase: SupabaseClient,
  momentKey: string,
  liturgicalKey: string | null,
): Promise<Map<string, MomentUsage>> {
  const { data, error } = await supabase.rpc("moment_song_usage", {
    p_moment: momentKey,
    p_key: liturgicalKey ?? "",
  });
  if (error) throw error;
  const map = new Map<string, MomentUsage>();
  for (const r of (data ?? []) as { song_id: string; n_moment: number; n_anchor: number }[]) {
    map.set(r.song_id, { nMoment: r.n_moment, nAnchor: r.n_anchor });
  }
  return map;
}
