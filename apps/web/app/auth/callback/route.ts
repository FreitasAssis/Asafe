import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * Callback de auth: o link do e-mail (recovery/confirm) passa pelo verify do Supabase e
 * cai aqui com `?code=`. Trocamos o code por sessão (grava os cookies) e seguimos para
 * `next` — validado como caminho interno para evitar open-redirect.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await serverClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  // Sem code ou troca falhou (link inválido/expirado) → login com aviso.
  return NextResponse.redirect(new URL("/login?erro=link", origin));
}
