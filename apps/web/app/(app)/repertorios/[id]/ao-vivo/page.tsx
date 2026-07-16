import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getRepertoirePackage } from "@/lib/repertoires";
import { LiveMode } from "@/components/live-mode";

/** Modo "Ao vivo" (B1): tela cheia escura para tocar o repertório. Cobre a barra lateral. */
export default async function AoVivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pkg = await getRepertoirePackage(supabase, id);
  if (!pkg) notFound();

  // Só o primeiro nome (ou o começo do e-mail) — "Seguindo Fulano" não pode ficar extenso.
  const full = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? "Anônimo";
  const name = full.split(/[\s@]/)[0] || full;

  return (
    <LiveMode
      pkg={pkg}
      backHref={`/repertorios/${id}`}
      repertoireId={id}
      userId={user.id}
      userName={name}
    />
  );
}
