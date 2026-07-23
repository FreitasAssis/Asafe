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
  const email = `ord_${uniq()}@asafe.test`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "pw-123456",
    options: { data: { display_name: "Ord" } },
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}
/** YYYY-MM-DD a `days` de hoje (offsets grandes evitam ambiguidade de fuso na virada). */
function relDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("repertoires_mine — ordenação por proximidade do evento", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("lista futuros (asc) → passados (recente→antigo) → sem data", async () => {
    const a = await signUp();
    // Inserida fora de ordem de propósito; os títulos codificam a posição esperada.
    const rows = [
      { title: "3-futuro-longe", date: relDate(30) },
      { title: "5-sem-data", date: null },
      { title: "1-futuro-perto", date: relDate(5) },
      { title: "4-passado-antigo", date: relDate(-300) },
      { title: "2-passado-recente", date: relDate(-5) },
    ];
    for (const r of rows) {
      const { error } = await a.client
        .from("repertoire")
        .insert({ title: r.title, type: "Missa", owner_id: a.userId, visibility: "private", date: r.date });
      if (error) throw error;
    }

    const { data, error } = await a.client.rpc("repertoires_mine");
    if (error) throw error;
    const titles = (data as { title: string }[]).map((r) => r.title);

    expect(titles).toEqual([
      "1-futuro-perto",
      "3-futuro-longe",
      "2-passado-recente",
      "4-passado-antigo",
      "5-sem-data",
    ]);
  });
});
