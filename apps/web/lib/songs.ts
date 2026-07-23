import type { SupabaseClient } from "@supabase/supabase-js";
import { stripChords } from "@asafe/chordpro";
import type {
  CopyrightStatus,
  LicenseKind,
  ModerationDecision,
  ModerationReason,
  TagCategory,
} from "@asafe/core";
import type { CommunityStatus } from "./repertoires";

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
  communityStatus: CommunityStatus;
  copyrightStatus: CopyrightStatus;
  copyrightEvidence: string | null;
  tagIds: string[];
}

/** Música pendente na fila de moderação. */
export interface PendingSong {
  id: string;
  title: string;
  ownerName: string | null;
  ownerEmail: string;
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
  communityStatus: CommunityStatus;
  tagIds: string[];
  /** Última data efetiva de uso (YYYY-MM-DD) entre meus repertórios, ou null. */
  lastUsed: string | null;
  /** Trecho da letra (2 linhas) p/ o card do seletor; vazio se referência (sem cifra liberada). */
  snippet: string;
}

interface SongRow {
  id: string;
  title: string;
  composer: string | null;
  default_key: string | null;
  // A cifra vem embutida de song_content (política de direitos: referência aqui, conteúdo
  // lá, com RLS própria). O PostgREST devolve como objeto ou array conforme a relação.
  song_content:
    | { chordpro_body: string | null }
    | { chordpro_body: string | null }[]
    | null;
  audio_links: string[];
  owner_id: string | null;
  community_status: CommunityStatus;
  copyright_status: CopyrightStatus;
  copyright_evidence: string | null;
  song_tag?: { tag_id: string }[];
}

/** Extrai a cifra do embed de song_content — vazia se a RLS não liberou o corpo (referência). */
function bodyOf(row: SongRow): string {
  const sc = Array.isArray(row.song_content) ? row.song_content[0] : row.song_content;
  return sc?.chordpro_body ?? "";
}

/** Trecho da letra (sem cifra nem diretivas) p/ o card do seletor: as 2 primeiras linhas. */
function lyricSnippet(chordpro: string): string {
  const lines = stripChords(chordpro)
    .split("\n")
    .map((l) => l.replace(/\{[^}]*\}/g, "").trim())
    .filter((l) => l !== "");
  return lines.slice(0, 2).join(" · ").slice(0, 90);
}

function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    defaultKey: row.default_key,
    chordproBody: bodyOf(row),
    audioLinks: row.audio_links ?? [],
    ownerId: row.owner_id,
    communityStatus: row.community_status,
    copyrightStatus: row.copyright_status,
    copyrightEvidence: row.copyright_evidence,
    tagIds: (row.song_tag ?? []).map((st) => st.tag_id),
  };
}

/** Campos de referência (metadado) do `song` — a cifra é escrita à parte em song_content. */
function inputToRow(input: SongInput) {
  return {
    title: input.title,
    composer: input.composer,
    default_key: input.defaultKey,
    audio_links: input.audioLinks,
  };
}

const SONG_COLS =
  "id, title, composer, default_key, song_content(chordpro_body), audio_links, owner_id, community_status, copyright_status, copyright_evidence, song_tag(tag_id)";

/** Carrega uma música por id, com suas tags. */
export async function getSong(supabase: SupabaseClient, id: string): Promise<Song | null> {
  const { data, error } = await supabase.from("song").select(SONG_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToSong(data as SongRow) : null;
}

/** Dono sugere a música à comunidade (→ pending). */
export async function requestPublishSong(
  supabase: SupabaseClient,
  id: string,
): Promise<CommunityStatus | null> {
  const { data, error } = await supabase.rpc("request_publish_song", { p_song_id: id });
  if (error) throw error;
  return (data as CommunityStatus | null) ?? null;
}

/** Classifica os direitos da música no gate de promoção (só o dono; RLS song_write_own). */
export async function classifySong(
  supabase: SupabaseClient,
  id: string,
  copyrightStatus: CopyrightStatus,
  evidence?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("song")
    .update({ copyright_status: copyrightStatus, copyright_evidence: evidence?.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

/** Registra o consentimento de obra própria (§7). O horário e o autor vêm do servidor. */
export async function recordOwnWorkConsent(
  supabase: SupabaseClient,
  id: string,
  license: LicenseKind,
  consentVersion: string,
): Promise<void> {
  const { error } = await supabase.rpc("record_own_work_consent", {
    p_song_id: id,
    p_license: license,
    p_consent_version: consentVersion,
  });
  if (error) throw error;
}

/** Dono retira a música da comunidade (→ none). */
export async function withdrawPublishSong(
  supabase: SupabaseClient,
  id: string,
): Promise<CommunityStatus | null> {
  const { data, error } = await supabase.rpc("withdraw_publish_song", { p_song_id: id });
  if (error) throw error;
  return (data as CommunityStatus | null) ?? null;
}

/** Moderador decide sobre uma música: approve/reject/revoke. */
export async function moderateSong(
  supabase: SupabaseClient,
  id: string,
  decision: ModerationDecision,
  reason?: ModerationReason,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("moderate_song", {
    p_song_id: id,
    p_decision: decision,
    p_reason: reason ?? null,
    p_note: note?.trim() ? note.trim() : null,
  });
  if (error) throw error;
}

/** Fila de moderação de músicas (só moderador vê linhas). */
export async function listPendingSongs(supabase: SupabaseClient): Promise<PendingSong[]> {
  const { data, error } = await supabase.rpc("pending_song_requests");
  if (error) throw error;
  return (
    data as { id: string; title: string; owner_name: string | null; owner_email: string }[]
  ).map((s) => ({ id: s.id, title: s.title, ownerName: s.owner_name, ownerEmail: s.owner_email }));
}

/** Lista as minhas músicas (com tags e frescor) para o catálogo, ordenadas por título. */
export async function listSongs(supabase: SupabaseClient): Promise<SongListItem[]> {
  const [songsRes, usageRes] = await Promise.all([
    supabase
      .from("song")
      .select("id, title, composer, owner_id, community_status, song_tag(tag_id), song_content(chordpro_body)")
      .order("title"),
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
    communityStatus: r.community_status,
    tagIds: (r.song_tag ?? []).map((st) => st.tag_id),
    lastUsed: lastUsed.get(r.id) ?? null,
    snippet: lyricSnippet(bodyOf(r)),
  }));
}

export async function createSong(
  supabase: SupabaseClient,
  ownerId: string,
  input: SongInput,
): Promise<Song> {
  // Referência em `song`; a cifra vai à parte em `song_content` (RLS própria).
  const { data, error } = await supabase
    .from("song")
    .insert({ ...inputToRow(input), owner_id: ownerId, visibility: "private" })
    .select(SONG_COLS)
    .single();
  if (error) throw error;
  const row = data as SongRow;
  const { error: cErr } = await supabase
    .from("song_content")
    .insert({ song_id: row.id, chordpro_body: input.chordproBody });
  if (cErr) throw cErr;
  return { ...rowToSong(row), chordproBody: input.chordproBody };
}

export async function updateSong(
  supabase: SupabaseClient,
  id: string,
  input: SongInput,
): Promise<void> {
  const { error } = await supabase.from("song").update(inputToRow(input)).eq("id", id);
  if (error) throw error;
  // Upsert do corpo (a linha de song_content pode não existir para músicas antigas).
  const { error: cErr } = await supabase
    .from("song_content")
    .upsert({ song_id: id, chordpro_body: input.chordproBody }, { onConflict: "song_id" });
  if (cErr) throw cErr;
}

export async function deleteSong(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("song").delete().eq("id", id);
  if (error) {
    // As relações próprias (tags/overrides) já cascateiam; a única FK que ainda
    // bloqueia é repertoire_item — a música está em uso num repertório.
    if (error.code === "23503") {
      throw new Error(
        "Esta música está em um ou mais repertórios. Remova-a deles antes de excluir.",
      );
    }
    throw error;
  }
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

/** Cria várias músicas em sequência (importação em lote). Chama `onProgress` a cada uma. */
export async function importSongs(
  supabase: SupabaseClient,
  ownerId: string,
  songs: { title: string; chordproBody: string; tagIds: string[] }[],
  onProgress?: (done: number) => void,
): Promise<number> {
  let done = 0;
  for (const s of songs) {
    const created = await createSong(supabase, ownerId, {
      title: s.title,
      composer: null,
      defaultKey: null,
      chordproBody: s.chordproBody,
      audioLinks: [],
    });
    if (s.tagIds.length > 0) await setSongTags(supabase, created.id, s.tagIds);
    onProgress?.(++done);
  }
  return done;
}
