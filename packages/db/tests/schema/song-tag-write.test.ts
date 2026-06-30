import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function signUp() {
  const c = createClient(url, anon);
  const email = `tagw_${Date.now()}_${Math.random().toString(16).slice(2)}@asafe.test`;
  const { data, error } = await c.auth.signUp({ email, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

describe("song_tag — escrita só na própria música (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("dono tagueia a própria música; estranho não", async () => {
    const a = await signUp();
    const b = await signUp();

    // tag global qualquer (seedada), legível por todos
    const svc = createClient(url, service, { auth: { persistSession: false } });
    const { data: tagRow } = await svc
      .from("tag")
      .select("id")
      .is("owner_id", null)
      .limit(1)
      .single();
    const tagId = (tagRow as { id: string }).id;

    // A cria uma música própria
    const { data: songRow, error: songErr } = await a.client
      .from("song")
      .insert({ title: "Minha", owner_id: a.userId, visibility: "private" })
      .select("id")
      .single();
    expect(songErr).toBeNull();
    const songId = (songRow as { id: string }).id;

    // A liga a tag na sua música → OK
    const okInsert = await a.client.from("song_tag").insert({ song_id: songId, tag_id: tagId });
    expect(okInsert.error).toBeNull();

    // B tenta taguear a música de A → bloqueado pela RLS
    const badInsert = await b.client
      .from("song_tag")
      .insert({ song_id: songId, tag_id: tagId });
    expect(badInsert.error).not.toBeNull();

    // B não consegue remover o vínculo de A (delete afeta 0 linhas)
    await b.client.from("song_tag").delete().eq("song_id", songId);
    const { count } = await svc
      .from("song_tag")
      .select("*", { count: "exact", head: true })
      .eq("song_id", songId);
    expect(count).toBe(1);
  });
});
