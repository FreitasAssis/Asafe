import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchWithRetry } from "./fetch-retry";

/**
 * Cliente Supabase para componentes server / route handlers. Lê e escreve a sessão
 * nos cookies da request. Em Server Components o `setAll` pode falhar (resposta já
 * iniciada) — ok, o middleware é quem renova a sessão.
 */
export async function serverClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Resiliência a soluços de rede no cold start do Worker (só repete leituras sem resposta).
      global: { fetch: fetchWithRetry() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de um Server Component — o middleware renova a sessão.
          }
        },
      },
    },
  );
}
