import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { user } from "../schema/user";
import type { db as Db } from "../client";

/**
 * Bootstrap do 1º admin (idempotente). Lê `ASAFE_ADMIN_EMAIL` (obrigatório) e:
 *  - se houver `ASAFE_ADMIN_PASSWORD` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`,
 *    CRIA a conta no Auth (Admin API, já confirmada, com `ASAFE_ADMIN_NAME`);
 *  - depois promove a `admin` o usuário desse e-mail (funciona se acabou de criar
 *    OU se já tinha se cadastrado pelo app).
 * Sem a env, é no-op. Delegar outros moderadores é ação de admin.
 */
export async function seedAdmin(db: typeof Db): Promise<string | null> {
  const email = process.env.ASAFE_ADMIN_EMAIL?.trim();
  if (!email) return null;

  const password = process.env.ASAFE_ADMIN_PASSWORD?.trim();
  const name = process.env.ASAFE_ADMIN_NAME?.trim() || null;
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // Cria a conta no Auth se tivermos senha + service role (bootstrap completo).
  if (password && supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    // "já registrado" é esperado em re-runs — seguimos para promover.
    if (error && !/already|registered|exists/i.test(error.message)) throw error;
  }

  // Promove a admin (o perfil public.user já existe: criado pelo trigger no signup).
  const rows = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ id: user.id });
  return rows.length > 0 ? email : null;
}
