import { db, closeDb } from "../client";
import { seedSlotTemplates } from "./slot-templates";

/** Runner do seed: `yarn db:seed`. Idempotente. */
async function main() {
  await seedSlotTemplates(db);
  // eslint-disable-next-line no-console
  console.log("✓ slot_template semeado");
  await closeDb();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
