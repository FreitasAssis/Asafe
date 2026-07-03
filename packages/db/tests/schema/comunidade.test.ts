import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, closeDb } from "../../src/client";
import { user } from "../../src/schema/user";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

function uniq() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
async function signUp(name: string) {
  const c = createClient(url, anon);
  const email = `com_${uniq()}@asafe.test`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "pw-123456",
    options: { data: { display_name: name } },
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id, email, name };
}
async function makeModerator(userId: string) {
  await db.update(user).set({ role: "moderator" }).where(eq(user.id, userId));
}
async function makeSong(a: { client: SupabaseClient; userId: string }, title: string) {
  const { data } = await a.client
    .from("song")
    .insert({ title, owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  const id = (data as { id: string }).id;
  // A cifra agora mora em song_content (separada por RLS).
  await a.client.from("song_content").insert({ song_id: id, chordpro_body: "[C]Paz" });
  return id;
}
async function seedRepertoire(a: { client: SupabaseClient; userId: string }) {
  const songId = await makeSong(a, `Canto ${uniq()}`);
  const { data: rep } = await a.client
    .from("repertoire")
    .insert({ title: `Missa ${uniq()}`, type: "Missa", owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  const repId = (rep as { id: string }).id;
  await a.client
    .from("repertoire_item")
    .insert({ repertoire_id: repId, song_id: songId, moment_slot: "entrada", order: 0 });
  return { repId, songId };
}
const canRead = async (c: SupabaseClient, table: string, id: string) => {
  const { data } = await c.from(table).select("id").eq("id", id);
  return (data ?? []).length === 1;
};

describe("comunidade — publicação moderada de repertório e música (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("repertório: 'public' não vaza; pendente só moderador; aprovar torna músicas legíveis (derivado); retirar reverte", async () => {
    const a = await signUp("Ana");
    const b = await signUp("Bruno");
    const { repId, songId } = await seedRepertoire(a);

    // visibility='public' à mão NÃO expõe
    await a.client.from("repertoire").update({ visibility: "public" }).eq("id", repId);
    expect(await canRead(b.client, "repertoire", repId)).toBe(false);

    // pedir → pendente; estranho não vê; música ainda não é legível a ele
    expect(await a.client.rpc("request_publish", { p_rep_id: repId }).then((r) => r.data)).toBe("pending");
    expect(await canRead(b.client, "repertoire", repId)).toBe(false);
    expect(await canRead(b.client, "song", songId)).toBe(false);

    // moderador vê o pendente e a música
    const m = await signUp("Mod");
    await makeModerator(m.userId);
    expect(await canRead(m.client, "repertoire", repId)).toBe(true);
    expect(await canRead(m.client, "song", songId)).toBe(true);

    // não-moderador não aprova
    expect((await b.client.rpc("moderate_repertoire", { p_rep_id: repId, p_decision: "approve" })).error).not.toBeNull();

    // aprovar → estranho vê o repertório E a música (derivado do repertório aprovado)
    expect(await m.client.rpc("moderate_repertoire", { p_rep_id: repId, p_decision: "approve" }).then((r) => r.data)).toBe("approved");
    expect(await canRead(b.client, "repertoire", repId)).toBe(true);
    expect(await canRead(b.client, "song", songId)).toBe(true);

    // retirar → some tudo (a música não está aprovada direto nem em outro repertório aprovado)
    expect(await a.client.rpc("withdraw_publish", { p_rep_id: repId }).then((r) => r.data)).toBe("none");
    expect(await canRead(b.client, "repertoire", repId)).toBe(false);
    expect(await canRead(b.client, "song", songId)).toBe(false);
  });

  it("música avulsa: pedir → moderar → aprovar torna global; retirar reverte; não-moderador não modera", async () => {
    const a = await signUp("Ana");
    const b = await signUp("Bruno");
    const songId = await makeSong(a, `Avulsa ${uniq()}`);

    expect(await canRead(b.client, "song", songId)).toBe(false);
    expect(await a.client.rpc("request_publish_song", { p_song_id: songId }).then((r) => r.data)).toBe("pending");
    expect(await canRead(b.client, "song", songId)).toBe(false);

    const m = await signUp("Mod");
    await makeModerator(m.userId);
    expect(await canRead(m.client, "song", songId)).toBe(true); // moderador revisa pendente
    expect((await b.client.rpc("moderate_song", { p_song_id: songId, p_decision: "approve" })).error).not.toBeNull();

    expect(await m.client.rpc("moderate_song", { p_song_id: songId, p_decision: "approve" }).then((r) => r.data)).toBe("approved");
    expect(await canRead(b.client, "song", songId)).toBe(true); // global

    expect(await a.client.rpc("withdraw_publish_song", { p_song_id: songId }).then((r) => r.data)).toBe("none");
    expect(await canRead(b.client, "song", songId)).toBe(false);
  });

  it("mine × community, filas separadas (repertório e música) e contador do moderador", async () => {
    const a = await signUp("Ana Autora");
    const b = await signUp("Bruno");
    const m = await signUp("Mod");
    await makeModerator(m.userId);

    const { repId } = await seedRepertoire(a);
    await a.client.rpc("request_publish", { p_rep_id: repId });
    const songId = await makeSong(a, `Solo ${uniq()}`);
    await a.client.rpc("request_publish_song", { p_song_id: songId });

    // filas separadas: repertório numa, música noutra
    expect((await m.client.rpc("pending_publish_requests")).data.some((r: { id: string }) => r.id === repId)).toBe(true);
    expect((await m.client.rpc("pending_song_requests")).data.some((r: { id: string }) => r.id === songId)).toBe(true);
    // não-moderador: filas vazias e contador 0
    expect((await b.client.rpc("pending_publish_requests")).data ?? []).toHaveLength(0);
    expect((await b.client.rpc("pending_moderation_count")).data).toBe(0);
    // contador do moderador conta os dois
    expect((await m.client.rpc("pending_moderation_count")).data).toBeGreaterThanOrEqual(2);

    // aprovar o repertório → mine (A) x community (B, com autor)
    await m.client.rpc("moderate_repertoire", { p_rep_id: repId, p_decision: "approve" });
    expect((await a.client.rpc("repertoires_mine")).data.some((r: { id: string }) => r.id === repId)).toBe(true);
    const bComm = (await b.client.rpc("repertoires_community")).data;
    const found = bComm.find((r: { id: string }) => r.id === repId);
    expect(found?.author_name).toBe("Ana Autora");
    expect((await b.client.rpc("repertoires_mine")).data.some((r: { id: string }) => r.id === repId)).toBe(false);
  });
});
