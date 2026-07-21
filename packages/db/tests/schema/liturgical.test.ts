import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, closeDb } from "../../src/client";
import { user } from "../../src/schema/user";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

const uniq = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

async function signUp() {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({ email: `lit_${uniq()}@asafe.test`, password: "pw-123456" });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}
async function makeModerator(userId: string) {
  await db.update(user).set({ role: "moderator" }).where(eq(user.id, userId));
}
async function makeSong(a: { client: SupabaseClient; userId: string }) {
  const { data } = await a.client
    .from("song")
    .insert({ title: `M ${uniq()}`, owner_id: a.userId, visibility: "private" })
    .select("id")
    .single();
  return (data as { id: string }).id;
}
/** Erro de permissão da RLS (INSERT/UPDATE bloqueado). */
const denied = (err: { code?: string } | null) => err?.code === "42501";
/** Consegue enxergar a linha `id` na `table`? (RLS de SELECT) */
const sees = async (c: SupabaseClient, table: string, id: string) => {
  const { data } = await c.from(table).select("id").eq("id", id);
  return (data ?? []).length === 1;
};

// db é singleton: um único afterAll no arquivo (fechar por describe encerraria a
// conexão que os describes seguintes ainda usam).
afterAll(async () => {
  await closeDb();
});

describe("liturgical_day / lectionary — cache (RLS)", () => {
  it("qualquer logado LÊ o cache; ninguém ESCREVE via RLS (só service_role/ingestão)", async () => {
    const a = await signUp();
    // semeado pela ingestão (conexão direta, contorna RLS)
    const key = `2026-01-06|BR|${uniq()}`;
    await db.execute(sql`insert into liturgical_day (date, nation, data) values ('2026-01-06', ${key}, '{"season":"christmas"}'::jsonb)`);
    await db.execute(sql`insert into lectionary (liturgical_key, cycle, readings) values (${key}, 'A', '{"gospel":"Mt 2"}'::jsonb)`);

    // LÊ
    const { data: dRows } = await a.client.from("liturgical_day").select("nation").eq("nation", key);
    expect((dRows ?? []).length).toBe(1);
    const { data: lRows } = await a.client.from("lectionary").select("cycle").eq("liturgical_key", key);
    expect((lRows ?? []).length).toBe(1);

    // NÃO escreve (sem policy de write → RLS nega)
    const dIns = await a.client.from("liturgical_day").insert({ date: "2026-02-02", nation: `X|${uniq()}`, data: {} });
    expect(denied(dIns.error)).toBe(true);
    const lIns = await a.client.from("lectionary").insert({ liturgical_key: `X|${uniq()}`, cycle: "B", readings: {} });
    expect(denied(lIns.error)).toBe(true);
  });
});

describe("pericope / pericope_segment (RLS)", () => {
  it("perícope GLOBAL (owner_id null) é visível a todos; PRÓPRIA só ao dono", async () => {
    const a = await signUp();
    const b = await signUp();

    // global, semeada via ingestão/curadoria
    const [g] = await db.execute<{ id: string }>(sql`insert into pericope (label, owner_id) values (${`Lc 15,11-32 ${uniq()}`}, null) returning id`);
    const globalId = (g as { id: string }).id;

    // própria de A
    const { data: own } = await a.client.from("pericope").insert({ label: `Jo 3,16 ${uniq()}` }).select("id").single();
    const ownId = (own as { id: string }).id;

    expect(await sees(a.client, "pericope", globalId)).toBe(true);
    expect(await sees(b.client, "pericope", globalId)).toBe(true);
    expect(await sees(a.client, "pericope", ownId)).toBe(true);
    expect(await sees(b.client, "pericope", ownId)).toBe(false); // privada de A não vaza
  });

  it("não dá pra criar perícope em nome de outro (withCheck do owner_id)", async () => {
    const a = await signUp();
    const b = await signUp();
    const ins = await a.client.from("pericope").insert({ label: `X ${uniq()}`, owner_id: b.userId });
    expect(denied(ins.error)).toBe(true);
  });

  it("segmentos seguem a visibilidade da perícope; escrita só na própria", async () => {
    const a = await signUp();
    const b = await signUp();

    const { data: own } = await a.client.from("pericope").insert({ label: `Lc 15 ${uniq()}` }).select("id").single();
    const pericopeId = (own as { id: string }).id;

    // A adiciona um segmento à SUA perícope
    const { data: seg, error: segErr } = await a.client
      .from("pericope_segment")
      .insert({ pericope_id: pericopeId, book: "LC", chapter: 15, verse_start: 11, verse_end: 32 })
      .select("id")
      .single();
    expect(segErr).toBeNull();
    const segId = (seg as { id: string }).id;

    expect(await sees(a.client, "pericope_segment", segId)).toBe(true);
    expect(await sees(b.client, "pericope_segment", segId)).toBe(false); // segue a perícope privada

    // B não pode adicionar segmento à perícope de A
    const bIns = await b.client
      .from("pericope_segment")
      .insert({ pericope_id: pericopeId, book: "LC", chapter: 15, verse_start: 1, verse_end: 3 });
    expect(denied(bIns.error)).toBe(true);
  });
});

/** Perícope global (catálogo), criada pela ingestão — é a que os vínculos usam. */
async function makeGlobalPericope() {
  const [p] = await db.execute<{ id: string }>(
    sql`insert into pericope (label, owner_id) values (${`Lc 15 ${uniq()}`}, null) returning id`,
  );
  return (p as { id: string }).id;
}

describe("song_pericope — vínculo GLOBAL + fila reativa (A4)", () => {
  it("vínculo nasce 'pending' e JÁ é visível a todos (fila reativa, não bloqueante)", async () => {
    const a = await signUp();
    const b = await signUp();
    const songA = await makeSong(a);
    const pericopeId = await makeGlobalPericope();

    const { data: link, error } = await a.client
      .from("song_pericope")
      .insert({ song_id: songA, pericope_id: pericopeId, suggested_moment: "comunhao" })
      .select("id, community_status")
      .single();
    expect(error).toBeNull();
    // nasce na fila...
    expect((link as { community_status: string }).community_status).toBe("pending");
    // ...mas já público (é o que inverte o padrão do resto do app)
    expect(await sees(b.client, "song_pericope", (link as { id: string }).id)).toBe(true);
  });

  it("vincular expõe a REFERÊNCIA da música, mas NUNCA a cifra", async () => {
    const a = await signUp();
    const b = await signUp();
    const songA = await makeSong(a); // música privada de A
    await a.client.from("song_content").insert({ song_id: songA, chordpro_body: "[C]cifra secreta" });

    // antes de vincular: estranho não vê nem a referência
    expect(await sees(b.client, "song", songA)).toBe(false);

    await a.client
      .from("song_pericope")
      .insert({ song_id: songA, pericope_id: await makeGlobalPericope() });

    // depois: vê a referência (metadado)...
    expect(await sees(b.client, "song", songA)).toBe(true);
    // ...e a cifra continua fechada (song_content tem RLS própria)
    const { data: body } = await b.client
      .from("song_content")
      .select("chordpro_body")
      .eq("song_id", songA);
    expect((body ?? []).length).toBe(0);
  });

  it("remoção: dono remove o seu; estranho NÃO remove o alheio; moderador remove qualquer um", async () => {
    const a = await signUp();
    const b = await signUp();
    const mod = await signUp();
    await makeModerator(mod.userId);
    const songA = await makeSong(a);
    const pericopeId = await makeGlobalPericope();

    const mk = async () => {
      const { data } = await a.client
        .from("song_pericope")
        .insert({ song_id: songA, pericope_id: pericopeId })
        .select("id")
        .single();
      return (data as { id: string }).id;
    };

    // estranho não remove
    const l1 = await mk();
    await b.client.from("song_pericope").delete().eq("id", l1);
    expect(await sees(a.client, "song_pericope", l1)).toBe(true);

    // dono remove o seu
    await a.client.from("song_pericope").delete().eq("id", l1);
    expect(await sees(a.client, "song_pericope", l1)).toBe(false);

    // moderador remove o de outro
    const l2 = await mk();
    await mod.client.from("song_pericope").delete().eq("id", l2);
    expect(await sees(a.client, "song_pericope", l2)).toBe(false);
  });

  it("moderador aprova = só tira da fila; o vínculo continua visível a todos", async () => {
    const a = await signUp();
    const b = await signUp();
    const mod = await signUp();
    await makeModerator(mod.userId);
    const songA = await makeSong(a);
    const { data: link } = await a.client
      .from("song_pericope")
      .insert({ song_id: songA, pericope_id: await makeGlobalPericope() })
      .select("id")
      .single();
    const id = (link as { id: string }).id;

    const { error } = await mod.client
      .from("song_pericope")
      .update({ community_status: "approved" })
      .eq("id", id);
    expect(error).toBeNull();

    const { data: after } = await mod.client
      .from("song_pericope")
      .select("community_status")
      .eq("id", id)
      .single();
    expect((after as { community_status: string }).community_status).toBe("approved");
    expect(await sees(b.client, "song_pericope", id)).toBe(true); // segue visível
  });

  it("não dá pra criar vínculo em nome de outro (withCheck do owner_id)", async () => {
    const a = await signUp();
    const b = await signUp();
    const songA = await makeSong(a);
    const ins = await b.client
      .from("song_pericope")
      .insert({ song_id: songA, pericope_id: await makeGlobalPericope(), owner_id: a.userId });
    expect(denied(ins.error)).toBe(true);
  });
});
