import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, closeDb } from "../../src/client";
import { user } from "../../src/schema/user";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

function uniq() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
async function signUp() {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({ email: `as_${uniq()}@asafe.test`, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}
async function makeModerator(userId: string) {
  await db.update(user).set({ role: "moderator" }).where(eq(user.id, userId));
}
const insertSource = (c: SupabaseClient, composer: string, key: string) =>
  c
    .from("authorized_source")
    .insert({ composer, composer_key: key, evidence: "https://autor.com/lic" })
    .select("id");

describe("authorized_source (fonte autorizada — RLS + função)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("só moderador lê/escreve a tabela; o gate consulta pela função (mínimo privilégio)", async () => {
    const mod = await signUp();
    const user1 = await signUp();
    await makeModerator(mod.userId);

    const composer = `Autor ${uniq()}`;
    const key = composer.toLowerCase();

    // não-moderador NÃO insere
    const asUser = await insertSource(user1.client, composer, key);
    expect(asUser.error).not.toBeNull();

    // moderador insere
    const asMod = await insertSource(mod.client, composer, key);
    expect(asMod.error).toBeNull();
    const id = (asMod.data as { id: string }[])[0]!.id;

    // não-moderador NÃO lê a tabela direto (mínimo privilégio)
    const raw = await user1.client.from("authorized_source").select("id").eq("id", id);
    expect(raw.data ?? []).toHaveLength(0);

    // ...mas consegue checar UM compositor pela função (o que o gate faz)
    const viaFn = await user1.client.rpc("authorized_source_for", { p_composer_key: key });
    expect(viaFn.error).toBeNull();
    expect((viaFn.data as { composer: string }[])[0]?.composer).toBe(composer);

    // função para autor inexistente → vazio
    const none = await user1.client.rpc("authorized_source_for", { p_composer_key: `zzz_${uniq()}` });
    expect((none.data as unknown[]) ?? []).toHaveLength(0);

    // não-moderador NÃO apaga (a linha continua lá para o moderador)
    await user1.client.from("authorized_source").delete().eq("id", id);
    const stillThere = await mod.client.from("authorized_source").select("id").eq("id", id).maybeSingle();
    expect(stillThere.data).not.toBeNull();
  });
});
