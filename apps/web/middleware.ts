import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas públicas (sem sessão): login, "Sobre" e as páginas de leitura por token (/r/...). */
const PUBLIC_PATHS = ["/login", "/sobre", "/r"];

/**
 * Renova a sessão do Supabase a cada request (refresh do cookie) e protege as rotas:
 * tudo que não for público exige sessão — sem ela, redireciona para `/login`.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANTE: getUser() valida o token e dispara o refresh quando necessário.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Roda em tudo, menos assets estáticos do Next. DEVE ser um literal estático —
  // o Next extrai este matcher em build; uma expressão (ex.: String.raw) faz o Next
  // rodar o middleware em TODAS as rotas, inclusive os chunks JS (que viram redirect).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|apple-icon.png|icons/).*)",
  ],
};
