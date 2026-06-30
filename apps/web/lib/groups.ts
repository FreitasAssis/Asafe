import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@asafe/core";

export interface Group {
  id: string;
  name: string;
  ownerId: string;
}

export interface GroupMember {
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
}

/** Pedido pendente de entrada num grupo. */
export interface JoinRequest {
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
}

export interface GroupInvite {
  id: string;
  token: string;
  role: MembershipRole;
  expiresAt: string | null;
}

function token() {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Meus grupos (sou dono ou membro — a RLS resolve). */
export async function listGroups(supabase: SupabaseClient): Promise<Group[]> {
  const { data, error } = await supabase
    .from("group")
    .select("id, name, owner_id")
    .order("name");
  if (error) throw error;
  return (data as { id: string; name: string; owner_id: string }[]).map((g) => ({
    id: g.id,
    name: g.name,
    ownerId: g.owner_id,
  }));
}

export async function getGroup(supabase: SupabaseClient, id: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from("group")
    .select("id, name, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const g = data as { id: string; name: string; owner_id: string };
  return { id: g.id, name: g.name, ownerId: g.owner_id };
}

/** Cria o grupo e já insere a membership do dono (papel owner). */
export async function createGroup(
  supabase: SupabaseClient,
  ownerId: string,
  name: string,
): Promise<Group> {
  const { data, error } = await supabase
    .from("group")
    .insert({ name, owner_id: ownerId })
    .select("id, name, owner_id")
    .single();
  if (error) throw error;
  const g = data as { id: string; name: string; owner_id: string };
  await supabase.from("membership").insert({ user_id: ownerId, group_id: g.id, role: "owner" });
  return { id: g.id, name: g.name, ownerId: g.owner_id };
}

/** Membros (e-mail + papel) — via função security definer (RLS não expõe e-mail alheio). */
export async function groupMembers(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupMember[]> {
  const { data, error } = await supabase.rpc("group_members", { p_group_id: groupId });
  if (error) throw error;
  return (data as { user_id: string; name: string | null; email: string; role: MembershipRole }[]).map(
    (m) => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role }),
  );
}

/** Pedidos pendentes de entrada (só o dono vê) — via função security definer. */
export async function listJoinRequests(
  supabase: SupabaseClient,
  groupId: string,
): Promise<JoinRequest[]> {
  const { data, error } = await supabase.rpc("group_join_requests", { p_group_id: groupId });
  if (error) throw error;
  return (data as { user_id: string; name: string | null; email: string; role: MembershipRole }[]).map(
    (r) => ({ userId: r.user_id, name: r.name, email: r.email, role: r.role }),
  );
}

/** Dono aprova um pedido: insere a membership e apaga o pedido. */
export async function approveRequest(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
  role: MembershipRole,
): Promise<void> {
  const ins = await supabase.from("membership").insert({ user_id: userId, group_id: groupId, role });
  if (ins.error) throw ins.error;
  const del = await supabase
    .from("join_request")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (del.error) throw del.error;
}

/** Dono recusa um pedido (apaga). */
export async function rejectRequest(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("join_request")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listInvites(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupInvite[]> {
  const { data, error } = await supabase
    .from("group_invite")
    .select("id, token, role, expires_at")
    .eq("group_id", groupId);
  if (error) throw error;
  return (data as { id: string; token: string; role: MembershipRole; expires_at: string | null }[]).map(
    (i) => ({ id: i.id, token: i.token, role: i.role, expiresAt: i.expires_at }),
  );
}

export async function createInvite(
  supabase: SupabaseClient,
  groupId: string,
  role: MembershipRole,
  expiresAt: string | null,
): Promise<GroupInvite> {
  const { data, error } = await supabase
    .from("group_invite")
    .insert({ group_id: groupId, token: token(), role, expires_at: expiresAt })
    .select("id, token, role, expires_at")
    .single();
  if (error) throw error;
  const i = data as { id: string; token: string; role: MembershipRole; expires_at: string | null };
  return { id: i.id, token: i.token, role: i.role, expiresAt: i.expires_at };
}

export async function revokeInvite(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("group_invite").delete().eq("id", id);
  if (error) throw error;
}

/** Dono remove um membro. */
export async function removeMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("membership")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Membro sai do grupo (apaga a própria membership). */
export async function leaveGroup(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("membership")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Pede para entrar num grupo via token de convite (função security definer).
 * Cria um pedido pendente; o dono precisa aprovar. Se já for membro, status='member'.
 */
export async function requestJoin(
  supabase: SupabaseClient,
  inviteToken: string,
): Promise<{ groupId: string; name: string; status: "pending" | "member" } | null> {
  const { data, error } = await supabase.rpc("request_join", { p_token: inviteToken });
  if (error) throw error;
  return (data as { groupId: string; name: string; status: "pending" | "member" } | null) ?? null;
}
