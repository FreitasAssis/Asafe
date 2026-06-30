import type { SupabaseClient } from "@supabase/supabase-js";

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
}

interface SongRow {
  id: string;
  title: string;
  composer: string | null;
  default_key: string | null;
  chordpro_body: string | null;
  audio_links: string[];
}

function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    defaultKey: row.default_key,
    chordproBody: row.chordpro_body ?? "",
    audioLinks: row.audio_links ?? [],
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

/** Carrega uma música por id (RLS garante que só o dono lê a própria). */
export async function getSong(
  supabase: SupabaseClient,
  id: string,
): Promise<Song | null> {
  const { data, error } = await supabase
    .from("song")
    .select("id, title, composer, default_key, chordpro_body, audio_links")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSong(data as SongRow) : null;
}

/** Cria uma música própria. `ownerId` vem da sessão (RLS exige owner_id = auth.uid()). */
export async function createSong(
  supabase: SupabaseClient,
  ownerId: string,
  input: SongInput,
): Promise<Song> {
  const { data, error } = await supabase
    .from("song")
    .insert({ ...inputToRow(input), owner_id: ownerId, visibility: "private" })
    .select("id, title, composer, default_key, chordpro_body, audio_links")
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
