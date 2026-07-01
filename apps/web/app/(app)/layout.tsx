import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { isModerator, pendingModerationCount } from "@/lib/repertoires";
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
  const moderator = await isModerator(supabase);
  const modCount = moderator ? await pendingModerationCount(supabase) : 0;

  return (
    <div style={{ minHeight: "100dvh" }}>
      <Sidebar userName={name} isModerator={moderator} moderationCount={modCount} />
      <div className="app-content">{children}</div>
    </div>
  );
}
