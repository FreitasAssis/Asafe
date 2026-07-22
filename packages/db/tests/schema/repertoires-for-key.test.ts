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
  const { data, error } = await c.auth.signUp({ email: `rfk_${uniq()}@asafe.test`, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

/** Missa com uma liturgical_key. */
async function makeMass(a: { client: SupabaseClient; userId: string }, key: string) {
  const { data } = await a.client
    .from("repertoire")
    .insert({ title: `Missa ${uniq()}`, type: "Missa", owner_id: a.userId, liturgical_key: key })
    .select("id")
    .single();
  return (data as { id: string }).id;
}
const forKey = async (c: SupabaseClient, key: string, exclude: string) => {
  const { data, error } = await c.rpc("repertoires_for_key", { p_key: key, p_exclude: exclude });
  if (error) throw error;
  return data as { id: string; title: string; mine: boolean }[];
};

const NONE = "00000000-0000-0000-0000-000000000000";

describe("repertoires_for_key — reaproveitar pela âncora (A5)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("devolve os MEUS da mesma chave (mine=true), exclui o atual e outras chaves", async () => {
    const a = await signUp();
    const key = `ordinary-16-sun|${uniq()}`;
    const meu = await makeMass(a, key);
    const atual = await makeMass(a, key); // o recém-criado (a ser excluído)
    await makeMass(a, `outra-${uniq()}`); // chave diferente

    const rows = await forKey(a.client, key, atual);
    expect(rows.map((r) => r.id)).toEqual([meu]); // só o meu, sem o atual nem a outra chave
    expect(rows[0]!.mine).toBe(true);
  });

  it("repertório do GRUPO conta como meu (mine=true)", async () => {
    const a = await signUp();
    const b = await signUp();
    const key = `lent-2-sun|${uniq()}`;
    // grupo do A com B; repertório de A compartilhado com o grupo
    const [g] = await db.execute<{ id: string }>(sql`insert into "group" (name, owner_id) values (${`G ${uniq()}`}, ${a.userId}) returning id`);
    const groupId = (g as { id: string }).id;
    await db.execute(sql`insert into membership (user_id, group_id, role) values (${a.userId}, ${groupId}, 'owner'), (${b.userId}, ${groupId}, 'viewer')`);
    const rep = await makeMass(a, key);
    await db.execute(sql`insert into repertoire_group (repertoire_id, group_id) values (${rep}, ${groupId})`);
    await db.execute(sql`update repertoire set visibility = 'group' where id = ${rep}`);

    const rows = await forKey(b.client, key, NONE); // B (membro) enxerga como seu/do grupo
    expect(rows.map((r) => r.id)).toContain(rep);
    expect(rows.find((r) => r.id === rep)!.mine).toBe(true);
  });

  it("APROVADO de estranho aparece (mine=false); PRIVADO de estranho não aparece", async () => {
    const a = await signUp();
    const b = await signUp();
    const key = `easter-3-sun|${uniq()}`;
    const aprovado = await makeMass(a, key);
    const privado = await makeMass(a, key);
    await db.execute(sql`update repertoire set community_status = 'approved' where id = ${aprovado}`);

    const rows = await forKey(b.client, key, NONE);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(aprovado);
    expect(ids).not.toContain(privado);
    expect(rows.find((r) => r.id === aprovado)!.mine).toBe(false); // é da comunidade, não meu
  });
});
