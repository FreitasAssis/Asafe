import { describe, expect, it, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db, closeDb } from "../src/client";

describe("conexão com o Postgres local", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("responde a select 1", async () => {
    const rows = await db.execute(sql`select 1 as ok`);
    // postgres-js retorna as linhas diretamente; ajuste o acesso se necessário
    expect(Number((rows as any)[0].ok)).toBe(1);
  });
});
