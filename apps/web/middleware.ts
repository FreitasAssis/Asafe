import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rotas públicas (sem sessão): login, "Sobre", páginas de leitura por token (/r/...) e o
 * fluxo de recuperação de senha (/auth/callback troca o code; /redefinir-senha define a nova).
 */
const PUBLIC_PATHS = ["/login", "/sobre", "/r", "/auth", "/redefinir-senha"];

/**
 * Renova a sessão do Supabase a cada request (refresh do cookie) e protege as rotas:
 * tudo que não for público exige sessão — sem ela, redireciona para `/login`.
 */
export async function middleware(request: NextRequest) {
  // Links antigos (WhatsApp) apontam pro *.workers.dev. Redireciona 301 (permanente),
  // preservando path e query, para o domínio oficial — sem matar os links antigos e
  // consolidando tudo num endereço só (SEO). Roda antes de qualquer coisa.
  const host = request.headers.get("host") ?? "";
  if (host.endsWith(".workers.dev")) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = "asafe.mus.br";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

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
  // "/" é a raiz pública (landing p/ deslogado; a própria página manda o logado pro app).
  const isPublic =
    pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!user && !isPublic) {
    // Preserva o destino para voltar após o login/cadastro (ex.: link de convite).
    const dest = pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", dest);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Roda em tudo, menos assets estáticos do Next. DEVE ser um literal estático —
  // o Next extrai este matcher em build; uma expressão (ex.: String.raw) faz o Next
  // rodar o middleware em TODAS as rotas, inclusive os chunks JS (que viram redirect).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|apple-icon.png|og.png|icons/).*)",
  ],
};
