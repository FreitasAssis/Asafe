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

describe("user (perfil + RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("cria perfil no signup (trigger) e o usuário lê só o próprio", async () => {
    const a = await signUp(`a_${Date.now()}@asafe.test`);
    const { data, error } = await a.client.from("user").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(a.userId);
  });

  it("isola: o usuário B não enxerga o perfil do A (RLS)", async () => {
    const a = await signUp(`a_${Date.now()}_${Math.random()}@asafe.test`);
    const b = await signUp(`b_${Date.now()}_${Math.random()}@asafe.test`);

    const { data: bData, error: bErr } = await b.client.from("user").select("*");
    expect(bErr).toBeNull();
    expect(bData).toHaveLength(1);
    expect(bData![0].id).toBe(b.userId);
    expect(bData![0].id).not.toBe(a.userId);
  });

  it("NÃO permite escalonar o próprio papel para admin (§6)", async () => {
    const a = await signUp(`esc_${Date.now()}_${Math.random()}@asafe.test`);

    // Tenta se promover a admin: o GRANT é UPDATE só na coluna 'email',
    // então o PostgREST deve negar a escrita em 'role'.
    const { error } = await a.client
      .from("user")
      .update({ role: "admin" })
      .eq("id", a.userId);
    expect(error).not.toBeNull();

    // E o papel continua 'user' de fato.
    const { data } = await a.client
      .from("user")
      .select("role")
      .eq("id", a.userId)
      .single();
    expect(data?.role).toBe("user");
  });
});
