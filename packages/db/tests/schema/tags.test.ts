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

/** Ids de dados globais (owner_id null) criados pelos testes, limpos no afterAll. */
const createdGlobalSongIds: string[] = [];
const createdGlobalTagIds: string[] = [];

describe("tag / song_tag / user_song_tag_override (RLS)", () => {
  afterAll(async () => {
    // Dependentes primeiro (FKs), depois song/tag. Só os ids capturados aqui.
    if (createdGlobalSongIds.length) {
      await service.from("song_tag").delete().in("song_id", createdGlobalSongIds);
      await service
        .from("user_song_tag_override")
        .delete()
        .in("song_id", createdGlobalSongIds);
      await service
        .from("repertoire_item")
        .delete()
        .in("song_id", createdGlobalSongIds);
      await service.from("song").delete().in("id", createdGlobalSongIds);
    }
    if (createdGlobalTagIds.length) {
      await service.from("song_tag").delete().in("tag_id", createdGlobalTagIds);
      await service
        .from("user_song_tag_override")
        .delete()
        .in("tag_id", createdGlobalTagIds);
      await service
        .from("repertoire_theme")
        .delete()
        .in("tag_id", createdGlobalTagIds);
      await service.from("tag").delete().in("id", createdGlobalTagIds);
    }
    await closeDb();
  });

  it("tag global visível a todos; tag pessoal de A só para A", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    // Tag global via service role. Nome único para não colidir com o seed.
    const { data: globalTag, error: gErr } = await service
      .from("tag")
      .insert({ name: `Entrada ${uniq()}`, category: "momento", owner_id: null })
      .select()
      .single();
    expect(gErr).toBeNull();
    createdGlobalTagIds.push(globalTag!.id as string);

    // Tag pessoal de A.
    const { data: personalTag, error: pErr } = await a.client
      .from("tag")
      .insert({ name: "Favorita A", category: "tema", owner_id: a.userId })
      .select()
      .single();
    expect(pErr).toBeNull();

    // Global visível a A e B.
    const { data: aGlobal } = await a.client
      .from("tag")
      .select("*")
      .eq("id", globalTag!.id);
    expect(aGlobal).toHaveLength(1);
    const { data: bGlobal } = await b.client
      .from("tag")
      .select("*")
      .eq("id", globalTag!.id);
    expect(bGlobal).toHaveLength(1);

    // Pessoal de A: visível a A, invisível a B.
    const { data: aPersonal } = await a.client
      .from("tag")
      .select("*")
      .eq("id", personalTag!.id);
    expect(aPersonal).toHaveLength(1);
    const { data: bPersonal } = await b.client
      .from("tag")
      .select("*")
      .eq("id", personalTag!.id);
    expect(bPersonal).toHaveLength(0);
  });

  it("song_tag de música global com tag global: A e B leem o vínculo", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    // Semeia música global, tag global e o vínculo via service role.
    const { data: gSong } = await service
      .from("song")
      .insert({ title: "Hino Global", owner_id: null })
      .select()
      .single();
    createdGlobalSongIds.push(gSong!.id as string);
    const { data: gTag } = await service
      .from("tag")
      .insert({ name: `Comunhão ${uniq()}`, category: "momento", owner_id: null })
      .select()
      .single();
    createdGlobalTagIds.push(gTag!.id as string);
    const { error: linkErr } = await service
      .from("song_tag")
      .insert({ song_id: gSong!.id, tag_id: gTag!.id });
    expect(linkErr).toBeNull();

    const { data: aLink, error: aErr } = await a.client
      .from("song_tag")
      .select("*")
      .eq("song_id", gSong!.id)
      .eq("tag_id", gTag!.id);
    expect(aErr).toBeNull();
    expect(aLink).toHaveLength(1);

    const { data: bLink, error: bErr } = await b.client
      .from("song_tag")
      .select("*")
      .eq("song_id", gSong!.id)
      .eq("tag_id", gTag!.id);
    expect(bErr).toBeNull();
    expect(bLink).toHaveLength(1);
  });

  it("override de A: B não lê nem escreve", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    // Música e tag globais para referenciar.
    const { data: gSong } = await service
      .from("song")
      .insert({ title: "Para Override", owner_id: null })
      .select()
      .single();
    createdGlobalSongIds.push(gSong!.id as string);
    const { data: gTag } = await service
      .from("tag")
      .insert({ name: `Saída ${uniq()}`, category: "momento", owner_id: null })
      .select()
      .single();
    createdGlobalTagIds.push(gTag!.id as string);

    // A cria override próprio.
    const { data: ovr, error: ovrErr } = await a.client
      .from("user_song_tag_override")
      .insert({
        user_id: a.userId,
        song_id: gSong!.id,
        tag_id: gTag!.id,
        action: "remove",
      })
      .select()
      .single();
    expect(ovrErr).toBeNull();
    expect(ovr!.user_id).toBe(a.userId);

    // B não lê o override de A.
    const { data: bRead, error: bReadErr } = await b.client
      .from("user_song_tag_override")
      .select("*")
      .eq("user_id", a.userId)
      .eq("song_id", gSong!.id)
      .eq("tag_id", gTag!.id);
    expect(bReadErr).toBeNull();
    expect(bRead).toHaveLength(0);

    // B não escreve override em nome de A (withCheck bloqueia -> erro).
    const { data: bWrite, error: bWriteErr } = await b.client
      .from("user_song_tag_override")
      .insert({
        user_id: a.userId,
        song_id: gSong!.id,
        tag_id: gTag!.id,
        action: "add",
      });
    expect(bWriteErr).not.toBeNull();
    expect(bWrite).toBeNull();

    // A ainda lê o próprio override.
    const { data: aRead } = await a.client
      .from("user_song_tag_override")
      .select("*")
      .eq("user_id", a.userId)
      .eq("song_id", gSong!.id)
      .eq("tag_id", gTag!.id);
    expect(aRead).toHaveLength(1);
    expect(aRead![0].action).toBe("remove");
  });
});
