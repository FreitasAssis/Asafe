import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase SERVICE-ROLE (server-only): contorna a RLS para escrever o
 * cache litúrgico (`liturgical_day` / `lectionary`), cuja escrita é reservada à
 * ingestão (ver A2 / DESIGN.md §6). Nunca deve ser importado no client.
 *
 * Requer `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor (secret no Worker).
 */
export function liturgyServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente no ambiente do servidor");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
