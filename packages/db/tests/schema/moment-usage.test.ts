import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const uniq = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

async function signUp() {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({ email: `mu_${uniq()}@asafe.test`, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}
async function makeSong(a: { client: SupabaseClient; userId: string }) {
  const { data } = await a.client
    .from("song")
    .insert({ title: `M ${uniq()}`, owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  return (data as { id: string }).id;
}
async function massWith(a: { client: SupabaseClient; userId: string }, key: string, songId: string) {
  const { data } = await a.client
    .from("repertoire")
    .insert({ title: `R ${uniq()}`, type: "Missa", owner_id: a.userId, liturgical_key: key })
    .select("id")
    .single();
  const repId = (data as { id: string }).id;
  await a.client.from("repertoire_item").insert({ repertoire_id: repId, song_id: songId, moment_slot: "comunhao", order: 0 });
  return repId;
}
const usage = async (c: SupabaseClient, key: string) => {
  const { data, error } = await c.rpc("moment_song_usage", { p_moment: "comunhao", p_key: key });
  if (error) throw error;
  return data as { song_id: string; n_moment: number; n_anchor: number }[];
};

describe("moment_song_usage — sinal de uso (RLS aplica)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("conta os MEUS usos no momento; n_anchor só na mesma chave", async () => {
    const a = await signUp();
    const key = `ordinary-16-sun|${uniq()}`;
    const song = await makeSong(a);
    await massWith(a, key, song); // mesma chave
    await massWith(a, key, song); // mesma chave
    await massWith(a, `outra-${uniq()}`, song); // chave diferente

    const row = (await usage(a.client, key)).find((r) => r.song_id === song);
    expect(row?.n_moment).toBe(3); // 3 usos na Comunhão
    expect(row?.n_anchor).toBe(2); // 2 na mesma celebração
  });

  it("NÃO conta repertório privado de outro (base = só o que vejo)", async () => {
    const a = await signUp();
    const b = await signUp();
    const key = `lent-3-sun|${uniq()}`;
    const songB = await makeSong(b);
    await massWith(b, key, songB); // privado de B

    const ids = (await usage(a.client, key)).map((r) => r.song_id);
    expect(ids).not.toContain(songB); // A não enxerga o de B
  });

  it("CONTA repertório aprovado de outro (aprovado é visível)", async () => {
    const a = await signUp();
    const b = await signUp();
    const key = `easter-2-sun|${uniq()}`;
    const songB = await makeSong(b);
    const rep = await massWith(b, key, songB);
    await db.execute(sql`update repertoire set community_status = 'approved' where id = ${rep}`);

    const row = (await usage(a.client, key)).find((r) => r.song_id === songB);
    expect(row?.n_moment).toBe(1); // A conta o aprovado de B
  });
});
