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

  return <ProjectionMode pkg={pkg} backHref={`/repertorios/${id}`} />;
}
