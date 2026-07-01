import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function signUp() {
  const c = createClient(url, anon);
  const email = `tags_${Date.now()}_${Math.random().toString(16).slice(2)}@asafe.test`;
  const { data, error } = await c.auth.signUp({ email, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

describe("song_tag — leitura só das músicas visíveis (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("estranho não enxerga as tags de uma música particular alheia", async () => {
    const a = await signUp();
    const b = await signUp();

    const svc = createClient(url, service, { auth: { persistSession: false } });
    const { data: tagRow } = await svc
      .from("tag")
      .select("id")
      .is("owner_id", null)
      .limit(1)
      .single();
    const tagId = (tagRow as { id: string }).id;

    // A cria uma música particular e a tagueia.
    const { data: songRow } = await a.client
      .from("song")
      .insert({ title: "Particular de A", owner_id: a.userId, visibility: "private" })
      .select("id")
      .single();
    const songId = (songRow as { id: string }).id;
    await a.client.from("song_tag").insert({ song_id: songId, tag_id: tagId });

    // B NÃO pode ver o vínculo da música particular de A.
    const { data: seenByB } = await b.client
      .from("song_tag")
      .select("song_id, tag_id")
      .eq("song_id", songId);
    expect(seenByB ?? []).toHaveLength(0);

    // O dono A continua vendo a própria.
    const { data: seenByA } = await a.client
      .from("song_tag")
      .select("song_id, tag_id")
      .eq("song_id", songId);
    expect(seenByA ?? []).toHaveLength(1);
  });
});
