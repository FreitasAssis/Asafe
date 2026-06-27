import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

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

describe("group + membership (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("dono cria grupo e o vê", async () => {
    const owner = await signUp(`owner_${uniq()}@asafe.test`);

    const { data: inserted, error: insErr } = await owner.client
      .from("group")
      .insert({ name: "Coral", owner_id: owner.userId })
      .select()
      .single();
    expect(insErr).toBeNull();
    expect(inserted!.owner_id).toBe(owner.userId);

    const { data: sel, error: selErr } = await owner.client
      .from("group")
      .select("*")
      .eq("id", inserted!.id);
    expect(selErr).toBeNull();
    expect(sel).toHaveLength(1);
    expect(sel![0].id).toBe(inserted!.id);
  });

  it("não-membro NÃO vê o grupo", async () => {
    const owner = await signUp(`owner_${uniq()}@asafe.test`);
    const stranger = await signUp(`stranger_${uniq()}@asafe.test`);

    const { data: g, error: insErr } = await owner.client
      .from("group")
      .insert({ name: "Privado", owner_id: owner.userId })
      .select()
      .single();
    expect(insErr).toBeNull();

    const { data: sel, error: selErr } = await stranger.client
      .from("group")
      .select("*")
      .eq("id", g!.id);
    expect(selErr).toBeNull();
    expect(sel).toHaveLength(0);
  });

  it("dono adiciona membro; membro passa a ver o grupo", async () => {
    const owner = await signUp(`owner_${uniq()}@asafe.test`);
    const member = await signUp(`member_${uniq()}@asafe.test`);

    const { data: g } = await owner.client
      .from("group")
      .insert({ name: "Compartilhado", owner_id: owner.userId })
      .select()
      .single();

    // antes: membro não vê
    const { data: before } = await member.client
      .from("group")
      .select("*")
      .eq("id", g!.id);
    expect(before).toHaveLength(0);

    // dono adiciona membro
    const { error: memErr } = await owner.client.from("membership").insert({
      user_id: member.userId,
      group_id: g!.id,
      role: "viewer",
    });
    expect(memErr).toBeNull();

    // depois: membro vê
    const { data: after, error: afterErr } = await member.client
      .from("group")
      .select("*")
      .eq("id", g!.id);
    expect(afterErr).toBeNull();
    expect(after).toHaveLength(1);
    expect(after![0].id).toBe(g!.id);
  });

  it("não-dono não consegue inserir membership no grupo", async () => {
    const owner = await signUp(`owner_${uniq()}@asafe.test`);
    const stranger = await signUp(`stranger_${uniq()}@asafe.test`);

    const { data: g } = await owner.client
      .from("group")
      .insert({ name: "Fechado", owner_id: owner.userId })
      .select()
      .single();

    // stranger tenta se adicionar (ou outro) — RLS withCheck bloqueia
    const { data, error } = await stranger.client.from("membership").insert({
      user_id: stranger.userId,
      group_id: g!.id,
      role: "viewer",
    });
    // PostgREST retorna erro de violação de RLS no insert
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
