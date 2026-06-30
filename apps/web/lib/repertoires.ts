import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepertoireType, SlotDef } from "@asafe/core";

export interface RepertoireListItem {
  id: string;
  title: string;
  type: RepertoireType;
  date: string | null;
  groupName: string | null;
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

export async function listRepertoires(
  supabase: SupabaseClient,
): Promise<RepertoireListItem[]> {
  const { data, error } = await supabase
    .from("repertoire")
    .select("id, title, type, date, group(name)")
    .order("date", { ascending: false, nullsFirst: false })
    .order("title");
  if (error) throw error;
  return (
    data as unknown as {
      id: string;
      title: string;
      type: RepertoireType;
      date: string | null;
      group: { name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    groupName: r.group?.name ?? null,
  }));
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
    .select(`id, title, type, date, owner_id, group_id, repertoire_item(${ITEM_COLS})`)
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
    repertoire_item: ItemRow[];
  };
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    ownerId: row.owner_id,
    groupId: row.group_id,
    items: (row.repertoire_item ?? []).map(rowToItem),
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
