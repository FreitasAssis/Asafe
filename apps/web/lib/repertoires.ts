import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepertoireType, SlotDef } from "@asafe/core";
import type { SharedPackage } from "@/components/public-repertoire";

/** Estado de publicação na comunidade (moderado). */
export type CommunityStatus = "none" | "pending" | "approved" | "rejected" | "returned";

export interface RepertoireListItem {
  id: string;
  title: string;
  type: RepertoireType;
  date: string | null;
  ownerId: string;
  groupName: string | null;
  communityStatus: CommunityStatus;
}

/** Item da aba Comunidade: repertório aprovado de outra pessoa (com o autor). */
export interface CommunityRepertoireItem {
  id: string;
  title: string;
  type: RepertoireType;
  date: string | null;
  authorName: string | null;
  authorEmail: string;
}

/** Pedido de publicação pendente (visto pelo moderador). */
export interface PendingRequest {
  id: string;
  title: string;
  type: RepertoireType;
  ownerName: string | null;
  ownerEmail: string;
}

export interface RepertoireItemFull {
  id: string;
  songId: string;
  songTitle: string;
  momentSlot: string | null;
  order: number;
  transpose: number;
  notes: string | null;
}

export interface Repertoire {
  id: string;
  title: string;
  type: RepertoireType;
  date: string | null;
  ownerId: string;
  groupId: string | null;
  communityStatus: CommunityStatus;
  items: RepertoireItemFull[];
}

export interface SlotTemplate {
  slots: SlotDef[];
  reorderable: boolean;
  allowCustomSlots: boolean;
}

/** Template de slots de um tipo (dado de referência seedado na Etapa 2). */
export async function slotTemplate(
  supabase: SupabaseClient,
  type: RepertoireType,
): Promise<SlotTemplate> {
  const { data, error } = await supabase
    .from("slot_template")
    .select("slots, reorderable, allow_custom_slots")
    .eq("type", type)
    .single();
  if (error) throw error;
  const row = data as {
    slots: SlotDef[];
    reorderable: boolean;
    allow_custom_slots: boolean;
  };
  return {
    slots: row.slots,
    reorderable: row.reorderable,
    allowCustomSlots: row.allow_custom_slots,
  };
}

/**
 * Meus repertórios (dono + compartilhados com meus grupos), via `repertoires_mine()`.
 * Não inclui os da comunidade — a RLS liberaria aprovados a todos, então usamos a função
 * que separa (senão o "Meus" misturaria repertório de estranho).
 */
export async function listRepertoires(
  supabase: SupabaseClient,
): Promise<RepertoireListItem[]> {
  const { data, error } = await supabase.rpc("repertoires_mine");
  if (error) throw error;
  return (
    data as {
      id: string;
      title: string;
      type: RepertoireType;
      date: string | null;
      owner_id: string;
      community_status: CommunityStatus;
      group_name: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    ownerId: r.owner_id,
    communityStatus: r.community_status,
    groupName: r.group_name,
  }));
}

/** Aba Comunidade: repertórios aprovados de outras pessoas (via `repertoires_community()`). */
export async function listCommunityRepertoires(
  supabase: SupabaseClient,
): Promise<CommunityRepertoireItem[]> {
  const { data, error } = await supabase.rpc("repertoires_community");
  if (error) throw error;
  return (
    data as {
      id: string;
      title: string;
      type: RepertoireType;
      date: string | null;
      author_name: string | null;
      author_email: string;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    authorName: r.author_name,
    authorEmail: r.author_email,
  }));
}

/** Dono sugere o repertório à comunidade (→ pending). Retorna o novo estado ou null. */
export async function requestPublish(
  supabase: SupabaseClient,
  id: string,
): Promise<CommunityStatus | null> {
  const { data, error } = await supabase.rpc("request_publish", { p_rep_id: id });
  if (error) throw error;
  return (data as CommunityStatus | null) ?? null;
}

/** Dono retira o repertório da comunidade (→ none). */
export async function withdrawPublish(
  supabase: SupabaseClient,
  id: string,
): Promise<CommunityStatus | null> {
  const { data, error } = await supabase.rpc("withdraw_publish", { p_rep_id: id });
  if (error) throw error;
  return (data as CommunityStatus | null) ?? null;
}

/** Moderador decide: approve/reject/revoke. */
export async function moderateRepertoire(
  supabase: SupabaseClient,
  id: string,
  decision: "approve" | "reject" | "revoke",
): Promise<void> {
  const { error } = await supabase.rpc("moderate_repertoire", { p_rep_id: id, p_decision: decision });
  if (error) throw error;
}

/** Fila de moderação (só moderador vê linhas). */
export async function listPendingRequests(
  supabase: SupabaseClient,
): Promise<PendingRequest[]> {
  const { data, error } = await supabase.rpc("pending_publish_requests");
  if (error) throw error;
  return (
    data as {
      id: string;
      title: string;
      type: RepertoireType;
      owner_name: string | null;
      owner_email: string;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    ownerName: r.owner_name,
    ownerEmail: r.owner_email,
  }));
}

/** O usuário atual é moderador/admin? */
export async function isModerator(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_moderator");
  if (error) throw error;
  return Boolean(data);
}

/** Quantos itens (repertórios + músicas) aguardam moderação. 0 se não for moderador. */
export async function pendingModerationCount(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("pending_moderation_count");
  if (error) throw error;
  return Number(data ?? 0);
}

interface ItemRow {
  id: string;
  song_id: string;
  moment_slot: string | null;
  order: number;
  transpose: number;
  notes: string | null;
  song: { title: string } | null;
}

function rowToItem(it: ItemRow): RepertoireItemFull {
  return {
    id: it.id,
    songId: it.song_id,
    songTitle: it.song?.title ?? "(música)",
    momentSlot: it.moment_slot,
    order: it.order,
    transpose: it.transpose,
    notes: it.notes,
  };
}

const ITEM_COLS = "id, song_id, moment_slot, order, transpose, notes, song(title)";

/** Repertório com seus itens (cada um com o título da música). */
export async function getRepertoire(
  supabase: SupabaseClient,
  id: string,
): Promise<Repertoire | null> {
  const { data, error } = await supabase
    .from("repertoire")
    .select(`id, title, type, date, owner_id, group_id, community_status, repertoire_item(${ITEM_COLS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // supabase-js infere o embed to-one (song) como array; no runtime é objeto → cast via unknown.
  const row = data as unknown as {
    id: string;
    title: string;
    type: RepertoireType;
    date: string | null;
    owner_id: string;
    group_id: string | null;
    community_status: CommunityStatus;
    repertoire_item: ItemRow[];
  };
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    ownerId: row.owner_id,
    groupId: row.group_id,
    communityStatus: row.community_status,
    items: (row.repertoire_item ?? []).map(rowToItem),
  };
}

/**
 * Pacote de leitura do repertório (mesma forma do link público), porém via RLS
 * autenticado. Lê a cifra de cada música — permitido ao dono ou a membros do grupo
 * (política `song_select_group`). Retorna null se o repertório não for visível.
 */
export async function getRepertoirePackage(
  supabase: SupabaseClient,
  id: string,
): Promise<SharedPackage | null> {
  const { data, error } = await supabase
    .from("repertoire")
    .select(
      `title, type, date, repertoire_item(id, moment_slot, order, transpose, notes, song(title, song_content(chordpro_body)))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type Content = { chordpro_body: string | null };
  const row = data as unknown as {
    title: string;
    type: RepertoireType;
    date: string | null;
    repertoire_item: {
      id: string;
      moment_slot: string | null;
      order: number;
      transpose: number;
      notes: string | null;
      // A cifra vem de song_content (RLS própria): fica null quando é só referência.
      song: { title: string; song_content: Content | Content[] | null } | null;
    }[];
  };
  const { slots } = await slotTemplate(supabase, row.type);
  return {
    repertoire: { title: row.title, type: row.type, date: row.date },
    slots,
    items: (row.repertoire_item ?? []).map((it) => {
      const sc = it.song?.song_content;
      const body = (Array.isArray(sc) ? sc[0] : sc)?.chordpro_body ?? null;
      return {
        id: it.id,
        momentSlot: it.moment_slot,
        order: it.order,
        transpose: it.transpose,
        notes: it.notes,
        title: it.song?.title ?? "(música)",
        chordpro: body,
      };
    }),
  };
}

/** Compartilha (ou descompartilha) o repertório com um grupo. Só o dono (RLS). */
export async function setRepertoireGroup(
  supabase: SupabaseClient,
  id: string,
  groupId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("repertoire")
    .update({ group_id: groupId, visibility: groupId ? "group" : "private" })
    .eq("id", id);
  if (error) throw error;
}

export async function createRepertoire(
  supabase: SupabaseClient,
  ownerId: string,
  input: { title: string; type: RepertoireType; date: string | null },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("repertoire")
    .insert({ ...input, owner_id: ownerId, visibility: "private" })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateRepertoire(
  supabase: SupabaseClient,
  id: string,
  input: { title: string; date: string | null },
): Promise<void> {
  const { error } = await supabase.from("repertoire").update(input).eq("id", id);
  if (error) throw error;
}

/** Adiciona uma música a um momento. `order` = posição dentro do momento. */
export async function addItem(
  supabase: SupabaseClient,
  repertoireId: string,
  songId: string,
  momentSlot: string | null,
  order: number,
): Promise<RepertoireItemFull> {
  const { data, error } = await supabase
    .from("repertoire_item")
    .insert({
      repertoire_id: repertoireId,
      song_id: songId,
      moment_slot: momentSlot,
      order,
    })
    .select(ITEM_COLS)
    .single();
  if (error) throw error;
  return rowToItem(data as unknown as ItemRow);
}

export async function removeItem(supabase: SupabaseClient, itemId: string): Promise<void> {
  const { error } = await supabase.from("repertoire_item").delete().eq("id", itemId);
  if (error) throw error;
}

/** Tom por ocorrência (semitons), separado da cifra salva. */
export async function setItemTranspose(
  supabase: SupabaseClient,
  itemId: string,
  transpose: number,
): Promise<void> {
  const { error } = await supabase.from("repertoire_item").update({ transpose }).eq("id", itemId);
  if (error) throw error;
}

export async function setItemNotes(
  supabase: SupabaseClient,
  itemId: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabase.from("repertoire_item").update({ notes }).eq("id", itemId);
  if (error) throw error;
}

/** Atualiza a posição (order) de um item dentro do momento. */
export async function setItemOrder(
  supabase: SupabaseClient,
  itemId: string,
  order: number,
): Promise<void> {
  const { error } = await supabase.from("repertoire_item").update({ order }).eq("id", itemId);
  if (error) throw error;
}

/** Exclui o repertório (apaga os itens antes, pois a FK não tem cascade). */
export async function deleteRepertoire(supabase: SupabaseClient, id: string): Promise<void> {
  const delItems = await supabase.from("repertoire_item").delete().eq("repertoire_id", id);
  if (delItems.error) throw delItems.error;
  const { error } = await supabase.from("repertoire").delete().eq("id", id);
  if (error) throw error;
}
