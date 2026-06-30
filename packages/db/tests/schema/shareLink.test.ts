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

/** Ids de songs globais (owner_id null) criadas pelos testes, limpas no afterAll. */
const createdGlobalSongIds: string[] = [];

/** Semeia uma song global (owner_id null) via service role. */
async function seedGlobalSong(title: string) {
  const { data, error } = await service
    .from("song")
    .insert({ title, owner_id: null })
    .select()
    .single();
  if (error) throw error;
  createdGlobalSongIds.push(data!.id as string);
  return data!.id as string;
}

/** Cria um repertório do dono `a` e retorna seu id. */
async function createRepertoire(a: Awaited<ReturnType<typeof signUp>>) {
  const { data: rep, error } = await a.client
    .from("repertoire")
    .insert({
      title: `Compartilhado ${uniq()}`,
      type: "Missa",
      owner_id: a.userId,
      visibility: "private",
    })
    .select()
    .single();
  if (error) throw error;
  return rep!.id as string;
}

/** Cria um share_link para `repertoireId` com `expiresAt` opcional. */
async function createShareLink(
  a: Awaited<ReturnType<typeof signUp>>,
  repertoireId: string,
  expiresAt?: string | null,
) {
  const token = `tok_${uniq()}`;
  const { data, error } = await a.client
    .from("share_link")
    .insert({
      repertoire_id: repertoireId,
      token,
      ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
    })
    .select()
    .single();
  if (error) throw error;
  return { token, link: data! };
}

describe("share_link + acesso público por token", () => {
  afterAll(async () => {
    if (createdGlobalSongIds.length) {
      await service
        .from("repertoire_item")
        .delete()
        .in("song_id", createdGlobalSongIds);
      await service.from("song").delete().in("id", createdGlobalSongIds);
    }
    await closeDb();
  });

  it("token válido abre o repertório para visitante anon (sem login)", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const repId = await createRepertoire(a);
    const { token } = await createShareLink(a, repId);

    const anonClient = createClient(url, anon);
    const { data, error } = await anonClient.rpc("get_shared_repertoire", {
      p_token: token,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(repId);
  });

  it("itens do repertório vêm pelo token", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const repId = await createRepertoire(a);
    const songId = await seedGlobalSong(`Song ${uniq()}`);

    const { error: itemErr } = await a.client
      .from("repertoire_item")
      .insert({ repertoire_id: repId, song_id: songId, order: 1 });
    expect(itemErr).toBeNull();

    const { token } = await createShareLink(a, repId);

    const anonClient = createClient(url, anon);
    const { data, error } = await anonClient.rpc(
      "get_shared_repertoire_items",
      { p_token: token },
    );
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].repertoire_id).toBe(repId);
    expect(data![0].song_id).toBe(songId);
  });

  it("token expirado não abre o repertório", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const repId = await createRepertoire(a);
    // expira no passado
    const past = new Date(Date.now() - 60_000).toISOString();
    const { token } = await createShareLink(a, repId, past);

    const anonClient = createClient(url, anon);
    const { data, error } = await anonClient.rpc("get_shared_repertoire", {
      p_token: token,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("token inválido não abre nada", async () => {
    const anonClient = createClient(url, anon);
    const { data, error } = await anonClient.rpc("get_shared_repertoire", {
      p_token: `tok_inexistente_${uniq()}`,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("anon NÃO varre a tabela repertoire (sem token, sem acesso)", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const repId = await createRepertoire(a);

    const anonClient = createClient(url, anon);
    const { data } = await anonClient
      .from("repertoire")
      .select("*")
      .eq("id", repId);
    // Sem GRANT para anon e sem policy para anon -> vazio (ou negado).
    expect(data ?? []).toHaveLength(0);
  });
});
