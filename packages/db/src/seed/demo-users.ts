import { createClient } from "@supabase/supabase-js";
import type { db as Db } from "../client";

/**
 * Usuários DEMO para testar funções localmente (grupos, comunidade, moderação, etc.).
 * Só roda com `ASAFE_SEED_DEMO` setado (nunca em produção) + `SUPABASE_URL`/service_role.
 * Usam o domínio `@asafe.dev` de propósito — a limpeza dos testes só apaga `@asafe.test`,
 * então estes PERSISTEM entre rodadas. Senha padrão em `ASAFE_DEMO_PASSWORD`.
 */
const DEMO_USERS = [
  { email: "ana@asafe.dev", name: "Ana (demo)" },
  { email: "bruno@asafe.dev", name: "Bruno (demo)" },
  { email: "celia@asafe.dev", name: "Célia (demo)" },
];

export async function seedDemoUsers(_db: typeof Db): Promise<string[]> {
  if (!process.env.ASAFE_SEED_DEMO) return [];
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return [];
  const password = process.env.ASAFE_DEMO_PASSWORD?.trim() || "asafe-demo-123";

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const created: string[] = [];
  for (const u of DEMO_USERS) {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: u.name },
    });
    if (error && !/already|registered|exists/i.test(error.message)) throw error;
    created.push(u.email);
  }
  return created;
}
