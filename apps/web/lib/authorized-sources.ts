import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTagName } from "@asafe/core";

/** Fonte autorizada (C10): permissão em bloco de um compositor/editora. */
export interface AuthorizedSource {
  id: string;
  composer: string;
  publisher: string | null;
  evidence: string;
  scope: string | null;
}

interface SourceRow {
  id: string;
  composer: string;
  publisher: string | null;
  evidence: string;
  scope: string | null;
}

const COLS = "id, composer, publisher, evidence, scope";

function rowTo(r: SourceRow): AuthorizedSource {
  return { id: r.id, composer: r.composer, publisher: r.publisher, evidence: r.evidence, scope: r.scope };
}

/** Lista as fontes autorizadas (todos os logados leem; usada na gestão do moderador). */
export async function listAuthorizedSources(supabase: SupabaseClient): Promise<AuthorizedSource[]> {
  const { data, error } = await supabase.from("authorized_source").select(COLS).order("composer");
  if (error) throw error;
  return (data as SourceRow[]).map(rowTo);
}

/** Registra uma fonte autorizada (só moderador — RLS). Normaliza a chave do compositor. */
export async function createAuthorizedSource(
  supabase: SupabaseClient,
  userId: string,
  input: { composer: string; publisher: string | null; evidence: string; scope: string | null },
): Promise<void> {
  const { error } = await supabase.from("authorized_source").insert({
    composer: input.composer.trim(),
    composer_key: normalizeTagName(input.composer),
    publisher: input.publisher?.trim() || null,
    evidence: input.evidence.trim(),
    scope: input.scope?.trim() || null,
    created_by: userId,
  });
  if (error) throw error;
}

/** Remove uma fonte autorizada (só moderador — RLS). */
export async function deleteAuthorizedSource(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("authorized_source").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Acha a fonte autorizada de um compositor (por chave normalizada), ou null. Vai pela função
 * `authorized_source_for` (security definer): o proponente checa só o autor da própria música,
 * sem poder listar a tabela (a leitura direta é restrita a moderador). Ver C10.
 */
export async function findAuthorizedSource(
  supabase: SupabaseClient,
  composer: string | null,
): Promise<AuthorizedSource | null> {
  if (!composer?.trim()) return null;
  const { data, error } = await supabase.rpc("authorized_source_for", {
    p_composer_key: normalizeTagName(composer),
  });
  if (error) throw error;
  const rows = (data as SourceRow[] | null) ?? [];
  return rows[0] ? rowTo(rows[0]) : null;
}
