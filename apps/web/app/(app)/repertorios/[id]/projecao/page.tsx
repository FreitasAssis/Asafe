import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getRepertoirePackage } from "@/lib/repertoires";
import { ProjectionMode } from "@/components/projection-mode";

/** Modo projeção (B2): letra grande no telão, tela cheia. Cobre a barra lateral. */
export default async function Projecao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pkg = await getRepertoirePackage(supabase, id);
  if (!pkg) notFound();

  const full = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? "Telão";
  const name = full.split(/[\s@]/)[0] || full;

  return (
    <ProjectionMode
      pkg={pkg}
      backHref={`/repertorios/${id}`}
      repertoireId={id}
      userId={user.id}
      userName={name}
    />
  );
}
