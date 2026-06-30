import type { SupabaseClient } from "@supabase/supabase-js";
import type { TagCategory } from "@asafe/core";

/** Campos editáveis de uma música própria (camelCase no app; snake_case no banco). */
export interface SongInput {
  title: string;
  composer: string | null;
  defaultKey: string | null;
  chordproBody: string;
  audioLinks: string[];
}

export interface Song extends SongInput {
  id: string;
  ownerId: string | null;
  tagIds: string[];
}

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  ownerId: string | null;
}

/** Item da listagem do catálogo (música + as tags que tem). */
export interface SongListItem {
  id: string;
  title: string;
  composer: string | null;
  ownerId: string | null;
  tagIds: string[];
  /** Última data efetiva de uso (YYYY-MM-DD) entre meus repertórios, ou null. */
  lastUsed: string | null;
}

interface SongRow {
  id: string;
  title: string;
  composer: string | null;
  default_key: string | null;
  chordpro_body: string | null;
  audio_links: string[];
  owner_id: string | null;
  song_tag?: { tag_id: string }[];
}

function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    defaultKey: row.default_key,
    chordproBody: row.chordpro_body ?? "",
    audioLinks: row.audio_links ?? [],
    ownerId: row.owner_id,
    tagIds: (row.song_tag ?? []).map((st) => st.tag_id),
  };
}

function inputToRow(input: SongInput) {
  return {
    title: input.title,
    composer: input.composer,
    default_key: input.defaultKey,
    chordpro_body: input.chordproBody,
    audio_links: input.audioLinks,
  };
}

const SONG_COLS =
  "id, title, composer, default_key, chordpro_body, audio_links, owner_id, song_tag(tag_id)";

/** Carrega uma música por id, com suas tags (RLS: só o dono lê a própria). */
export async function getSong(supabase: SupabaseClient, id: string): Promise<Song | null> {
  const { data, error } = await supabase.from("song").select(SONG_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToSong(data as SongRow) : null;
}

/** Lista as minhas músicas (com tags e frescor) para o catálogo, ordenadas por título. */
export async function listSongs(supabase: SupabaseClient): Promise<SongListItem[]> {
  const [songsRes, usageRes] = await Promise.all([
    supabase.from("song").select("id, title, composer, owner_id, song_tag(tag_id)").order("title"),
    supabase.from("repertoire_item").select("song_id, repertoire(date, created_at)"),
  ]);
  if (songsRes.error) throw songsRes.error;
  if (usageRes.error) throw usageRes.error;

  // Última data efetiva de uso (data da celebração ou, na falta, criação) por música.
  const lastUsed = new Map<string, string>();
  const usage = usageRes.data as unknown as {
    song_id: string;
    repertoire: { date: string | null; created_at: string } | null;
  }[];
  for (const row of usage) {
    if (!row.repertoire) continue;
    const eff = (row.repertoire.date ?? row.repertoire.created_at).slice(0, 10);
    const prev = lastUsed.get(row.song_id);
    if (!prev || eff > prev) lastUsed.set(row.song_id, eff);
  }

  return (songsRes.data as SongRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    composer: r.composer,
    ownerId: r.owner_id,
    tagIds: (r.song_tag ?? []).map((st) => st.tag_id),
    lastUsed: lastUsed.get(r.id) ?? null,
  }));
}

export async function createSong(
  supabase: SupabaseClient,
  ownerId: string,
  input: SongInput,
): Promise<Song> {
  const { data, error } = await supabase
    .from("song")
    .insert({ ...inputToRow(input), owner_id: ownerId, visibility: "private" })
    .select(SONG_COLS)
    .single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function updateSong(
  supabase: SupabaseClient,
  id: string,
  input: SongInput,
): Promise<void> {
  const { error } = await supabase.from("song").update(inputToRow(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteSong(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("song").delete().eq("id", id);
  if (error) throw error;
}

/** Tags visíveis ao usuário: globais (owner_id nulo) + as próprias (RLS resolve). */
export async function listTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tag")
    .select("id, name, category, owner_id")
    .order("name");
  if (error) throw error;
  return (data as { id: string; name: string; category: TagCategory; owner_id: string | null }[]).map(
    (t) => ({ id: t.id, name: t.name, category: t.category, ownerId: t.owner_id }),
  );
}

/** Cria uma tag pessoal (owner = você). */
export async function createTag(
  supabase: SupabaseClient,
  ownerId: string,
  name: string,
  category: TagCategory,
): Promise<Tag> {
  const { data, error } = await supabase
    .from("tag")
    .insert({ name, category, owner_id: ownerId })
    .select("id, name, category, owner_id")
    .single();
  if (error) throw error;
  const t = data as { id: string; name: string; category: TagCategory; owner_id: string | null };
  return { id: t.id, name: t.name, category: t.category, ownerId: t.owner_id };
}

/** Aplica o conjunto de tags de uma música (diff: liga as novas, desliga as removidas). */
export async function setSongTags(
  supabase: SupabaseClient,
  songId: string,
  tagIds: string[],
): Promise<void> {
  const { data, error } = await supabase.from("song_tag").select("tag_id").eq("song_id", songId);
  if (error) throw error;
  const existing = new Set((data as { tag_id: string }[]).map((r) => r.tag_id));
  const selected = new Set(tagIds);
  const toAdd = tagIds.filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !selected.has(id));

  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("song_tag")
      .delete()
      .eq("song_id", songId)
      .in("tag_id", toRemove);
    if (delErr) throw delErr;
  }
  if (toAdd.length > 0) {
    const { error: insErr } = await supabase
      .from("song_tag")
      .insert(toAdd.map((tagId) => ({ song_id: songId, tag_id: tagId })));
    if (insErr) throw insErr;
  }
}
