import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getRepertoire, getRepertoirePackage } from "@/lib/repertoires";
import { myMembershipRole } from "@/lib/groups";
import { PublicRepertoire } from "@/components/public-repertoire";
import { Breadcrumb } from "@/components/breadcrumb";
import { EditPencil } from "@/components/edit-pencil";

export default async function VerRepertorio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const header = (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
    >
      <Breadcrumb
        items={[{ label: "Repertórios", href: "/repertorios" }, { label: pkg.repertoire.title }]}
      />
      {canEdit && <EditPencil href={`/repertorios/${id}/editar`} />}
    </div>
  );

  return <PublicRepertoire pkg={pkg} header={header} />;
}
