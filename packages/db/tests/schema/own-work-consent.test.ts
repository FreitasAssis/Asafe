import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

function uniq() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
async function signUp(name: string) {
  const c = createClient(url, anon);
  const email = `own_${uniq()}@asafe.test`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "pw-123456",
    options: { data: { display_name: name } },
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id, email, name };
}
async function makeSong(a: { client: SupabaseClient; userId: string }, title: string) {
  const { data } = await a.client
    .from("song")
    .insert({ title, owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  const id = (data as { id: string }).id;
  await a.client.from("song_content").insert({ song_id: id, chordpro_body: "[C]Paz" });
  return id;
}
type ConsentRow = {
  copyright_status: string;
  license: string | null;
  consent_text_version: string | null;
  consented_at: string | null;
  consented_by: string | null;
};
async function readConsent(c: SupabaseClient, id: string): Promise<ConsentRow | null> {
  const { data } = await c
    .from("song")
    .select("copyright_status, license, consent_text_version, consented_at, consented_by")
    .eq("id", id)
    .maybeSingle();
  return (data as ConsentRow) ?? null;
}

describe("consentimento de obra própria — record_own_work_consent (§7)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("o dono grava licença + consentimento versionado; servidor preenche quando/quem; vira licenca_aberta", async () => {
    const a = await signUp("Ana Autora");
    const songId = await makeSong(a, `Minha obra ${uniq()}`);

    // Antes: default (assume protegida) e sem consentimento.
    const before = await readConsent(a.client, songId);
    expect(before?.copyright_status).toBe("desconhecida");
    expect(before?.license).toBeNull();
    expect(before?.consented_at).toBeNull();

    const { error } = await a.client.rpc("record_own_work_consent", {
      p_song_id: songId,
      p_license: "cc_by",
      p_consent_version: "obra-propria-v1",
    });
    expect(error).toBeNull();

    const after = await readConsent(a.client, songId);
    expect(after?.copyright_status).toBe("licenca_aberta");
    expect(after?.license).toBe("cc_by");
    expect(after?.consent_text_version).toBe("obra-propria-v1");
    expect(after?.consented_at).not.toBeNull(); // now() do servidor
    expect(after?.consented_by).toBe(a.userId); // auth.uid() do servidor
  });

  it("não-dono não grava consentimento na música alheia (owner-only)", async () => {
    const a = await signUp("Ana Autora");
    const b = await signUp("Bruno Bisbilhoteiro");
    const songId = await makeSong(a, `Obra da Ana ${uniq()}`);

    // Bruno tenta declarar consentimento na obra da Ana: a função não acha linha do dono.
    const { error } = await b.client.rpc("record_own_work_consent", {
      p_song_id: songId,
      p_license: "cc_by",
      p_consent_version: "obra-propria-v1",
    });
    expect(error).toBeNull(); // não estoura, apenas não afeta linha alheia

    const after = await readConsent(a.client, songId);
    expect(after?.copyright_status).toBe("desconhecida");
    expect(after?.license).toBeNull();
    expect(after?.consented_by).toBeNull();
  });
});
