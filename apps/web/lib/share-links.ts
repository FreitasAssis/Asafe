import type { SupabaseClient } from "@supabase/supabase-js";

export interface ShareLink {
  id: string;
  token: string;
  expiresAt: string | null;
}

interface ShareLinkRow {
  id: string;
  token: string;
  expires_at: string | null;
}

/** Token aleatório URL-safe (122 bits do randomUUID, sem hifens). */
function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function listShareLinks(
  supabase: SupabaseClient,
  repertoireId: string,
): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from("share_link")
    .select("id, token, expires_at")
    .eq("repertoire_id", repertoireId);
  if (error) throw error;
  return (data as ShareLinkRow[]).map((r) => ({
    id: r.id,
    token: r.token,
    expiresAt: r.expires_at,
  }));
}

export async function createShareLink(
  supabase: SupabaseClient,
  repertoireId: string,
  expiresAt: string | null,
): Promise<ShareLink> {
  const { data, error } = await supabase
    .from("share_link")
    .insert({ repertoire_id: repertoireId, token: generateToken(), expires_at: expiresAt })
    .select("id, token, expires_at")
    .single();
  if (error) throw error;
  const r = data as ShareLinkRow;
  return { id: r.id, token: r.token, expiresAt: r.expires_at };
}

export async function revokeShareLink(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("share_link").delete().eq("id", id);
  if (error) throw error;
}
