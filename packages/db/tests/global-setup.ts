import { db, closeDb } from "../src/client";
import { seedSlotTemplates } from "../src/seed/slot-templates";
import { seedGlobalTags } from "../src/seed/global-tags";

export async function setup() {
  await seedSlotTemplates(db);
  await seedGlobalTags(db);
  await closeDb();
}
