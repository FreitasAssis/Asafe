import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../../src/client";
import { slotTemplate } from "../../src/schema/slotTemplate";
import { seedSlotTemplates, SLOT_TEMPLATES } from "../../src/seed/slot-templates";

describe("seed de slot_template", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("semeia um template por tipo (idempotente)", async () => {
    await seedSlotTemplates(db);
    await seedSlotTemplates(db); // roda 2x: não deve duplicar (PK = type)
    const rows = await db.select().from(slotTemplate);
    expect(rows.length).toBe(SLOT_TEMPLATES.length);
  });

  it("Missa é canônica (não reordenável); grupo de oração é flexível", async () => {
    await seedSlotTemplates(db);
    const [missa] = await db
      .select()
      .from(slotTemplate)
      .where(eq(slotTemplate.type, "Missa"));
    const [grupo] = await db
      .select()
      .from(slotTemplate)
      .where(eq(slotTemplate.type, "GrupoDeOracao"));

    expect(missa?.reorderable).toBe(false);
    expect(grupo?.reorderable).toBe(true);
    // Missa começa com 'entrada' e termina com 'final'
    const slots = missa?.slots as { key: string }[];
    expect(slots[0]?.key).toBe("entrada");
    expect(slots.at(-1)?.key).toBe("final");
  });
});
