"use server";

import { parseReadingRef, segmentsOverlap, type PericopeSegment } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { listSongs, listTags, type SongListItem, type Tag } from "@/lib/songs";
import { liturgyServiceClient } from "./service";

/** Uma música ligada a uma leitura (encontrada por sobreposição). */
export interface LinkedSong {
  linkId: string;
  songId: string;
  title: string;
  composer: string | null;
  suggestedMoment: string | null;
  /** O vínculo é meu? (só o dono — ou um moderador — pode remover) */
  mine: boolean;
}

/**
 * Perícope GLOBAL (owner_id null) para a referência — acha ou cria. Criada via
 * service-role porque o catálogo global não é escrito pelo usuário; assim todos
 * conseguem ler a perícope do vínculo (que é global, ver A4b).
 */
async function findOrCreateGlobalPericope(ref: string): Promise<string | null> {
  const segments = parseReadingRef(ref);
  if (segments.length === 0) return null; // referência não reconhecida → não vincula

  const svc = liturgyServiceClient();
  const label = ref.trim();

  const { data: existing } = await svc
    .from("pericope")
    .select("id")
    .is("owner_id", null)
    .eq("label", label)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await svc
    .from("pericope")
    .insert({ label, owner_id: null })
    .select("id")
    .single();
  if (error) throw error;
  const pericopeId = (created as { id: string }).id;

  const { error: segErr } = await svc.from("pericope_segment").insert(
    segments.map((s) => ({
      pericope_id: pericopeId,
      book: s.book,
      chapter: s.chapter,
      verse_start: s.verseStart,
      verse_end: s.verseEnd,
    })),
  );
  if (segErr) throw segErr;
  return pericopeId;
}

/** Liga uma música a uma leitura. O vínculo nasce global e entra na fila (A4b). */
export async function linkSongToReading(
  readingRef: string,
  songId: string,
  suggestedMoment: string | null,
): Promise<void> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const pericopeId = await findOrCreateGlobalPericope(readingRef);
  if (!pericopeId) throw new Error("Não reconheci essa referência bíblica.");

  const { error } = await supabase.from("song_pericope").insert({
    song_id: songId,
    pericope_id: pericopeId,
    suggested_moment: suggestedMoment,
  });
  if (error) throw error;
}

/** Remove um vínculo (a RLS permite ao dono ou a um moderador). */
export async function unlinkSong(linkId: string): Promise<void> {
  const supabase = await serverClient();
  const { error } = await supabase.from("song_pericope").delete().eq("id", linkId);
  if (error) throw error;
}

/**
 * Músicas ligadas a uma leitura, casando por SOBREPOSIÇÃO — é o que faz um
 * vínculo criado em "Lc 15,11-32" aparecer quando o dia vem "Lc 15,1-3.11-32".
 *
 * O SQL estreita por (livro, capítulo) — indexado — e a interseção fina roda no
 * `@asafe/core`, mantendo a regra numa fonte só.
 */
export async function songsForReading(readingRef: string): Promise<LinkedSong[]> {
  const segments = parseReadingRef(readingRef);
  if (segments.length === 0) return [];

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    .select("id, song_id, suggested_moment, owner_id, song(title, composer)")
    .in("pericope_id", [...matching]);

  type Row = {
    id: string;
    song_id: string;
    suggested_moment: string | null;
    owner_id: string;
    song: { title: string; composer: string | null } | null;
  };
  return ((links ?? []) as unknown as Row[]).map((l) => ({
    linkId: l.id,
    songId: l.song_id,
    title: l.song?.title ?? "(música)",
    composer: l.song?.composer ?? null,
    suggestedMoment: l.suggested_moment,
    mine: l.owner_id === user?.id,
  }));
}

/** Um vínculo na fila de moderação. */
export interface PendingLink {
  linkId: string;
  songId: string;
  songTitle: string;
  readingLabel: string;
  suggestedMoment: string | null;
  authorName: string | null;
}

/**
 * Fila de moderação dos vínculos: os que ainda não foram triados. Lembrando que
 * eles JÁ estão públicos (A4b) — a fila é reativa: o moderador só decide entre
 * REMOVER o vínculo ou MANTER (o que apenas o tira da fila).
 */
export async function listPendingLinks(): Promise<PendingLink[]> {
  const supabase = await serverClient();
  // RPC security definer: o join com o autor não sai da RLS (mesmo padrão das
  // outras filas); a função se protege com is_moderator().
  const { data, error } = await supabase.rpc("pending_pericope_links");
  if (error) throw error;

  type Row = {
    id: string;
    song_id: string;
    song_title: string;
    reading_label: string;
    suggested_moment: string | null;
    author_name: string | null;
    author_email: string;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    linkId: r.id,
    songId: r.song_id,
    songTitle: r.song_title,
    readingLabel: r.reading_label,
    suggestedMoment: r.suggested_moment,
    authorName: r.author_name ?? r.author_email,
  }));
}

/** "Manter": tira da fila sem mudar nada para quem vê (o vínculo já era público). */
export async function keepLink(linkId: string): Promise<void> {
  const supabase = await serverClient();
  const { error } = await supabase
    .from("song_pericope")
    .update({ community_status: "approved" })
    .eq("id", linkId);
  if (error) throw error;
}

/** Catálogo do usuário para o seletor de músicas (o mesmo do construtor). */
export async function catalogForPicker(): Promise<{ songs: SongListItem[]; tags: Tag[] }> {
  const supabase = await serverClient();
  const [songs, tags] = await Promise.all([listSongs(supabase), listTags(supabase)]);
  return { songs, tags };
}
