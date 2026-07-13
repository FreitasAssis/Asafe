import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getRepertoire, getRepertoirePackage } from "@/lib/repertoires";
import { myMembershipRole } from "@/lib/groups";
import { PublicRepertoire } from "@/components/public-repertoire";
import { Breadcrumb } from "@/components/breadcrumb";
import { EditPencil } from "@/components/edit-pencil";
import { TakeRepertoireButton } from "@/components/take-repertoire-button";

export default async function VerRepertorio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [pkg, repertoire] = await Promise.all([
    getRepertoirePackage(supabase, id),
    getRepertoire(supabase, id),
  ]);
  if (!pkg || !repertoire) notFound();

  // Edita o dono ou um editor do grupo (viewer só lê).
  const isOwner = repertoire.ownerId === user.id;
  const role = repertoire.groupId
    ? await myMembershipRole(supabase, repertoire.groupId, user.id)
    : null;
  const canEdit = isOwner || role === "editor";
  // Repertório da comunidade que não é meu → posso "pegar" (clonar) para os meus.
  const canTake = !isOwner && repertoire.communityStatus === "approved";
  // Breadcrumb reflete de onde vim (fila de moderação, aba comunidade, ou a lista padrão).
  let originCrumb = { label: "Repertórios", href: "/repertorios" };
  if (from === "moderacao") originCrumb = { label: "Moderação", href: "/moderacao" };
  else if (from === "comunidade") originCrumb = { label: "Comunidade", href: "/repertorios?aba=comunidade" };

  const header = (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
    >
      <Breadcrumb items={[originCrumb, { label: pkg.repertoire.title }]} />
      <span className="flex items-center gap-2">
        <a href={`/repertorios/${id}/ao-vivo`} className="btn">
          Ao vivo
        </a>
        {canEdit && <EditPencil href={`/repertorios/${id}/editar`} />}
        {canTake && <TakeRepertoireButton sourceId={id} userId={user.id} />}
      </span>
    </div>
  );

  return <PublicRepertoire pkg={pkg} header={header} />;
}
