import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "../../src/client";
import { user } from "../../src/schema/user";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

const uniq = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;
async function signUp() {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({ email: `mod_${uniq()}@asafe.test`, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}
async function makeModerator(userId: string) {
  await db.update(user).set({ role: "moderator" }).where(eq(user.id, userId));
}
async function makeSong(a: { client: SupabaseClient; userId: string }) {
  const { data } = await a.client
    .from("song")
    .insert({ title: `M ${uniq()}`, owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  return (data as { id: string }).id;
}
const events = async (c: SupabaseClient, targetId: string) => {
  const { data } = await c.from("moderation_event").select("decision, reason, note").eq("target_id", targetId);
  return data ?? [];
};

describe("moderação — log, motivo e devolução (C3)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("recusar com motivo grava um moderation_event; o dono vê, o estranho não", async () => {
    const a = await signUp();
    const b = await signUp();
    const m = await signUp();
    await makeModerator(m.userId);
    const songId = await makeSong(a);
    await a.client.rpc("request_publish_song", { p_song_id: songId });

    const dec = await m.client.rpc("moderate_song", {
      p_song_id: songId,
      p_decision: "reject",
      p_reason: "protegida_sem_permissao",
      p_note: "compositor vivo",
    });
    expect(dec.data).toBe("rejected");

    const evA = await events(a.client, songId); // dono vê o evento da SUA submissão
    expect(evA).toHaveLength(1);
    expect(evA[0]).toMatchObject({ decision: "reject", reason: "protegida_sem_permissao", note: "compositor vivo" });

    expect(await events(b.client, songId)).toHaveLength(0); // estranho não vê
  });

  it("devolver (return) → returned; e o dono pode reenviar (returned → pending)", async () => {
    const a = await signUp();
    const m = await signUp();
    await makeModerator(m.userId);
    const songId = await makeSong(a);
    await a.client.rpc("request_publish_song", { p_song_id: songId });

    const dec = await m.client.rpc("moderate_song", {
      p_song_id: songId,
      p_decision: "return",
      p_reason: "autoria_status_incorreto",
    });
    expect(dec.data).toBe("returned");

    const re = await a.client.rpc("request_publish_song", { p_song_id: songId });
    expect(re.data).toBe("pending"); // devolvida volta a pending no reenvio
  });

  it("chamada de 2 args (retrocompat) ainda funciona e loga com motivo nulo", async () => {
    const a = await signUp();
    const m = await signUp();
    await makeModerator(m.userId);
    const songId = await makeSong(a);
    await a.client.rpc("request_publish_song", { p_song_id: songId });

    const dec = await m.client.rpc("moderate_song", { p_song_id: songId, p_decision: "approve" });
    expect(dec.data).toBe("approved");
    const ev = await events(m.client, songId);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.reason).toBeNull();
  });
});
