import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

function uniq() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
async function signUp(displayName?: string) {
  const c = createClient(url, anon);
  const email = `grp_${uniq()}@asafe.test`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "pw-123456",
    options: { data: { display_name: displayName ?? null } },
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id, email };
}
/** Cria um grupo + a membership do dono (como o app fará). */
async function createGroup(owner: { client: SupabaseClient; userId: string }, name: string) {
  const { data: g, error } = await owner.client
    .from("group")
    .insert({ name, owner_id: owner.userId })
    .select("id")
    .single();
  if (error) throw error;
  const id = (g as { id: string }).id;
  await owner.client.from("membership").insert({ user_id: owner.userId, group_id: id, role: "owner" });
  return id;
}
/** Dono aprova um pedido (como o app fará): insere a membership e apaga o pedido. */
async function approve(
  owner: { client: SupabaseClient },
  groupId: string,
  userId: string,
  role: string,
) {
  await owner.client.from("membership").insert({ user_id: userId, group_id: groupId, role });
  await owner.client.from("join_request").delete().eq("group_id", groupId).eq("user_id", userId);
}

describe("grupos E2 — convite, aprovação, co-edição (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("convite por link: B pede entrada (pendente) → dono aprova; token inválido não cria pedido", async () => {
    const a = await signUp("Ana");
    const groupId = await createGroup(a, "Equipe Missa");
    const token = `inv_${uniq()}`;
    await a.client.from("group_invite").insert({ group_id: groupId, token, role: "editor" });

    const b = await signUp("Bruno");
    const { data: req, error } = await b.client.rpc("request_join", { p_token: token });
    expect(error).toBeNull();
    expect(req.groupId).toBe(groupId);
    expect(req.status).toBe("pending");

    // idempotente: pedir de novo não duplica
    await b.client.rpc("request_join", { p_token: token });

    // token inválido → null
    const { data: bad } = await b.client.rpc("request_join", { p_token: "nao-existe" });
    expect(bad).toBeNull();

    // dono vê o pedido pendente (com nome), com papel do convite
    const { data: pending } = await a.client.rpc("group_join_requests", { p_group_id: groupId });
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe("Bruno");
    expect(pending[0].email).toBe(b.email);
    expect(pending[0].role).toBe("editor");

    // antes de aprovar, B ainda não é membro
    const { data: before } = await a.client.rpc("group_members", { p_group_id: groupId });
    expect(before).toHaveLength(1);

    // dono aprova → B vira membro; o pedido some
    await approve(a, groupId, b.userId, "editor");
    const { data: after } = await a.client.rpc("group_members", { p_group_id: groupId });
    expect(after).toHaveLength(2);
    expect(after.map((m: { name: string }) => m.name).sort()).toEqual(["Ana", "Bruno"]);
    const { data: stillPending } = await a.client.rpc("group_join_requests", { p_group_id: groupId });
    expect(stillPending ?? []).toHaveLength(0);

    // um de fora não vê membros
    const c = await signUp();
    const { data: outsider } = await c.client.rpc("group_members", { p_group_id: groupId });
    expect(outsider ?? []).toHaveLength(0);
  });

  it("editor co-edita repertório do grupo; viewer não escreve; dono remove membro", async () => {
    const a = await signUp("Ana");
    const groupId = await createGroup(a, "Equipe 2");
    // B editor, C viewer — ambos pedem entrada e são aprovados
    const tokE = `e_${uniq()}`;
    const tokV = `v_${uniq()}`;
    await a.client.from("group_invite").insert({ group_id: groupId, token: tokE, role: "editor" });
    await a.client.from("group_invite").insert({ group_id: groupId, token: tokV, role: "viewer" });
    const b = await signUp("Bruno");
    const c = await signUp("Célia");
    await b.client.rpc("request_join", { p_token: tokE });
    await c.client.rpc("request_join", { p_token: tokV });
    await approve(a, groupId, b.userId, "editor");
    await approve(a, groupId, c.userId, "viewer");

    // A cria uma música e um repertório compartilhado com o grupo
    const { data: song } = await a.client
      .from("song")
      .insert({ title: "Canto", owner_id: a.userId, visibility: "private" })
      .select("id")
      .single();
    const { data: rep } = await a.client
      .from("repertoire")
      .insert({ title: "Missa Grupo", type: "Missa", owner_id: a.userId, visibility: "group" })
      .select("id")
      .single();
    const repId = (rep as { id: string }).id;
    await a.client.from("repertoire_group").insert({ repertoire_id: repId, group_id: groupId });
    const songId = (song as { id: string }).id;

    // editor B insere item → OK
    const okB = await b.client
      .from("repertoire_item")
      .insert({ repertoire_id: repId, song_id: songId, moment_slot: "entrada", order: 0 });
    expect(okB.error).toBeNull();

    // viewer C tenta inserir item → bloqueado
    const badC = await c.client
      .from("repertoire_item")
      .insert({ repertoire_id: repId, song_id: songId, moment_slot: "final", order: 0 });
    expect(badC.error).not.toBeNull();

    // C (viewer) ao menos VÊ o repertório do grupo
    const { data: seen } = await c.client.from("repertoire").select("id").eq("id", repId);
    expect(seen).toHaveLength(1);

    // membro do grupo (B) LÊ a música do repertório compartilhado (song_select_group);
    // alguém de fora (D) não.
    const { data: bSong } = await b.client.from("song").select("id").eq("id", songId);
    expect(bSong).toHaveLength(1);
    const d = await signUp();
    const { data: dSong } = await d.client.from("song").select("id").eq("id", songId);
    expect(dSong ?? []).toHaveLength(0);

    // dono A remove B
    await a.client.from("membership").delete().eq("group_id", groupId).eq("user_id", b.userId);
    // B perde acesso de edição: agora não vê mais o repertório do grupo
    const { data: bSees } = await b.client.from("repertoire").select("id").eq("id", repId);
    expect(bSees ?? []).toHaveLength(0);
  });
});
