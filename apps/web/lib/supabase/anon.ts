import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase ANÔNIMO (sem sessão) — para a página pública de leitura, que chama
 * apenas a RPC `get_shared_repertoire_full` (security definer). Não acessa tabelas.
 */
export function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
