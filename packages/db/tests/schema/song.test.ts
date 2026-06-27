import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Cliente service role: contorna RLS, usado para semear catálogo global. */
const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signUp(email: string) {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({
    email,
    password: "pw-123456",
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

const uniq = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("song (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("música própria de A é visível para A e invisível para B", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const { data: inserted, error: insErr } = await a.client
      .from("song")
      .insert({ title: "Minha Música", owner_id: a.userId })
      .select()
      .single();
    expect(insErr).toBeNull();
    expect(inserted!.owner_id).toBe(a.userId);

    const { data: aSel, error: aErr } = await a.client
      .from("song")
      .select("*")
      .eq("id", inserted!.id);
    expect(aErr).toBeNull();
    expect(aSel).toHaveLength(1);

    const { data: bSel, error: bErr } = await b.client
      .from("song")
      .select("*")
      .eq("id", inserted!.id);
    expect(bErr).toBeNull();
    expect(bSel).toHaveLength(0);
  });

  it("música global (owner_id null via service role) é visível para A e B", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const { data: global, error: gErr } = await service
      .from("song")
      .insert({ title: "Catálogo Global", owner_id: null })
      .select()
      .single();
    expect(gErr).toBeNull();
    expect(global!.owner_id).toBeNull();

    const { data: aSel, error: aErr } = await a.client
      .from("song")
      .select("*")
      .eq("id", global!.id);
    expect(aErr).toBeNull();
    expect(aSel).toHaveLength(1);

    const { data: bSel, error: bErr } = await b.client
      .from("song")
      .select("*")
      .eq("id", global!.id);
    expect(bErr).toBeNull();
    expect(bSel).toHaveLength(1);
  });

  it("B não consegue escrever (update/delete) música de A", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const { data: song, error: insErr } = await a.client
      .from("song")
      .insert({ title: "Protegida", owner_id: a.userId })
      .select()
      .single();
    expect(insErr).toBeNull();

    // UPDATE de B não atinge a linha (RLS using filtra) -> 0 linhas afetadas.
    const { data: upd } = await b.client
      .from("song")
      .update({ title: "Hackeada" })
      .eq("id", song!.id)
      .select();
    expect(upd).toEqual([]);

    // DELETE de B idem.
    const { data: del } = await b.client
      .from("song")
      .delete()
      .eq("id", song!.id)
      .select();
    expect(del).toEqual([]);

    // A ainda vê a música com o título original.
    const { data: aSel } = await a.client
      .from("song")
      .select("*")
      .eq("id", song!.id)
      .single();
    expect(aSel!.title).toBe("Protegida");
  });
});
