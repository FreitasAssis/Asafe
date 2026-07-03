import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

function uniq() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function signUp() {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({
    email: `sf_${uniq()}@asafe.test`,
    password: "pw-123456",
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

describe("get_shared_repertoire_full (acesso público por token)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("anônimo abre token válido e recebe o pacote (com cifra); expirado/inválido não", async () => {
    const a = await signUp();
    const sb = a.client;

    // música própria com cifra (corpo em song_content)
    const { data: song } = await sb
      .from("song")
      .insert({ title: "Cordeiro de Deus", owner_id: a.userId, visibility: "private" })
      .select("id")
      .single();
    await sb
      .from("song_content")
      .insert({ song_id: (song as { id: string }).id, chordpro_body: "[C]Cordeiro [G]de Deus" });
    // repertório Missa
    const { data: rep } = await sb
      .from("repertoire")
      .insert({ title: "Missa Compartilhada", type: "Missa", owner_id: a.userId, visibility: "private" })
      .select("id")
      .single();
    // item com transpose + nota
    await sb.from("repertoire_item").insert({
      repertoire_id: (rep as { id: string }).id,
      song_id: (song as { id: string }).id,
      moment_slot: "comunhao",
      order: 0,
      transpose: 2,
      notes: "começar no refrão",
    });
    // link válido + link expirado
    const token = `tok_${uniq()}`;
    const expiredToken = `exp_${uniq()}`;
    await sb.from("share_link").insert({ repertoire_id: (rep as { id: string }).id, token });
    await sb.from("share_link").insert({
      repertoire_id: (rep as { id: string }).id,
      token: expiredToken,
      expires_at: "2000-01-01T00:00:00Z",
    });

    // visitante ANÔNIMO (sem login)
    const anonClient = createClient(url, anon);

    const { data: pkg, error } = await anonClient.rpc("get_shared_repertoire_full", { p_token: token });
    expect(error).toBeNull();
    expect(pkg).not.toBeNull();
    expect(pkg.repertoire.title).toBe("Missa Compartilhada");
    expect(pkg.slots.length).toBeGreaterThan(0); // rótulos do template
    expect(pkg.items).toHaveLength(1);
    expect(pkg.items[0].chordpro).toContain("[C]Cordeiro");
    expect(pkg.items[0].transpose).toBe(2);
    expect(pkg.items[0].notes).toBe("começar no refrão");

    // token expirado → null
    const { data: exp } = await anonClient.rpc("get_shared_repertoire_full", { p_token: expiredToken });
    expect(exp).toBeNull();
    // token inexistente → null
    const { data: bad } = await anonClient.rpc("get_shared_repertoire_full", { p_token: "nao-existe" });
    expect(bad).toBeNull();

    // anônimo NÃO lê as tabelas direto
    const { data: songs } = await anonClient.from("song").select("*");
    expect(songs ?? []).toHaveLength(0);
    const { data: reps } = await anonClient.from("repertoire").select("*");
    expect(reps ?? []).toHaveLength(0);
  });
});
