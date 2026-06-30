import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

/**
 * Shell das páginas logadas: busca o usuário uma vez, redireciona sem sessão e
 * envolve o conteúdo com a sidebar. As rotas públicas (/login, /r, /convite)
 * ficam fora deste route group e não recebem o menu.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (user.user_metadata?.display_name as string | undefined)?.trim() || user.email!;

  return (
    <div style={{ minHeight: "100dvh" }}>
      <Sidebar userName={name} />
      <div className="app-content">{children}</div>
    </div>
  );
}
