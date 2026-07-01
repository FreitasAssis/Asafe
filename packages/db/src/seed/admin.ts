import { eq } from "drizzle-orm";
import { user } from "../schema/user";
import type { db as Db } from "../client";

/**
 * Bootstrap do 1º admin: promove a `admin` o usuário cujo e-mail está em
 * `ASAFE_ADMIN_EMAIL` — se ele já tiver se cadastrado. Idempotente. Sem a env
 * (ou sem o usuário), não faz nada. Delegar outros moderadores é ação de admin.
 */
export async function seedAdmin(db: typeof Db): Promise<string | null> {
  const email = process.env.ASAFE_ADMIN_EMAIL?.trim();
  if (!email) return null;
  const rows = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ id: user.id });
  return rows.length > 0 ? email : null;
}
