import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para componentes client (browser). A sessão vive em cookie,
 * compartilhada com o servidor via @supabase/ssr.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
