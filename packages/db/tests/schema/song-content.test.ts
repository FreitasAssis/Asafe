import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "../../src/client";
import { group } from "../../src/schema/group";
import { membership } from "../../src/schema/membership";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const svc = createClient(url, service, { auth: { persistSession: false } });

const uniq = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;
async function signUp() {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({ email: `sc_${uniq()}@asafe.test`, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

/** Cria música do dono `a` com corpo em song_content; opcionalmente ajusta copyright/community (via svc). */
async function makeSong(
  a: { client: SupabaseClient; userId: string },
  opts: { copyright?: string; community?: string } = {},
) {
  const { data } = await a.client
    .from("song")
    .insert({ title: `M ${uniq()}`, owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  const id = (data as { id: string }).id;
  await a.client.from("song_content").insert({ song_id: id, chordpro_body: "[C]corpo secreto" });
  const patch: Record<string, string> = {};
  if (opts.copyright) patch.copyright_status = opts.copyright;
  if (opts.community) patch.community_status = opts.community;
  if (Object.keys(patch).length) await svc.from("song").update(patch).eq("id", id);
  return id;
}

const readBody = async (c: SupabaseClient, songId: string) => {
  const { data } = await c.from("song_content").select("chordpro_body").eq("song_id", songId);
  return (data ?? [])[0]?.chordpro_body ?? null;
};
const canSeeRef = async (c: SupabaseClient, songId: string) => {
  const { data } = await c.from("song").select("id").eq("id", songId);
  return (data ?? []).length === 1;
};

describe("song_content — referência × conteúdo (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("comunidade: música PROTEGIDA aprovada — estranho vê a referência, NÃO o corpo; dono vê o corpo", async () => {
    const a = await signUp();
    const b = await signUp();
    const songId = await makeSong(a, { copyright: "protegida", community: "approved" });

    expect(await canSeeRef(b.client, songId)).toBe(true); // referência: sim
    expect(await readBody(b.client, songId)).toBeNull(); // conteúdo: NÃO
    expect(await readBody(a.client, songId)).toBe("[C]corpo secreto"); // dono: sim
  });

  it("comunidade: música LIVRE (domínio público) aprovada — estranho VÊ o corpo", async () => {
    const a = await signUp();
    const b = await signUp();
    const songId = await makeSong(a, { copyright: "dominio_publico", community: "approved" });

    expect(await readBody(b.client, songId)).toBe("[C]corpo secreto");
  });

  it("grupo: membro vê o corpo mesmo de música PROTEGIDA (conteúdo cheio no grupo)", async () => {
    const a = await signUp();
    const b = await signUp();
    const songId = await makeSong(a, { copyright: "protegida" }); // nem aprovada

    // grupo do A com B como membro (setup via drizzle/db — evita PostgREST + palavra
    // reservada "group"); repertório de grupo com a música
    const [g] = await db.insert(group).values({ name: `G ${uniq()}`, ownerId: a.userId }).returning({ id: group.id });
    const groupId = g!.id;
    await db.insert(membership).values({ userId: b.userId, groupId, role: "viewer" });
    const { data: rep } = await a.client
      .from("repertoire")
      .insert({ title: `R ${uniq()}`, type: "Missa", owner_id: a.userId, group_id: groupId, visibility: "group" })
      .select("id")
      .single();
    await a.client
      .from("repertoire_item")
      .insert({ repertoire_id: (rep as { id: string }).id, song_id: songId, order: 0 });

    expect(await readBody(b.client, songId)).toBe("[C]corpo secreto"); // membro do grupo: sim
  });

  it("música pessoal (não aprovada, não em grupo): estranho não vê nem referência nem corpo", async () => {
    const a = await signUp();
    const b = await signUp();
    const songId = await makeSong(a, { copyright: "protegida" });

    expect(await canSeeRef(b.client, songId)).toBe(false);
    expect(await readBody(b.client, songId)).toBeNull();
  });
});
