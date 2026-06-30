import { db, closeDb } from "../client";
import { seedSlotTemplates } from "./slot-templates";
import { seedGlobalTags } from "./global-tags";

/** Runner do seed: `yarn db:seed`. Idempotente. */
async function main() {
  await seedSlotTemplates(db);
  // eslint-disable-next-line no-console
  console.log("✓ slot_template semeado");
  await seedGlobalTags(db);
  // eslint-disable-next-line no-console
  console.log("✓ tags globais semeadas");
  await closeDb();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
