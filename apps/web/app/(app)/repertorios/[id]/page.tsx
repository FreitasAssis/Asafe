import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getRepertoire, isRepertoireFavorite } from "@/lib/repertoires";
import { getStagePackage } from "@/lib/liturgy/stage-package";
import { PublicRepertoire } from "@/components/public-repertoire";
import { Breadcrumb } from "@/components/breadcrumb";
import { EditPencil } from "@/components/edit-pencil";
import { TakeRepertoireButton } from "@/components/take-repertoire-button";
import { FavoriteStar } from "@/components/favorite-star";

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
    getStagePackage(supabase, id),
    getRepertoire(supabase, id),
  ]);
  if (!pkg || !repertoire) notFound();

  // Edita o dono ou um editor de ALGUM grupo vinculado (viewer só lê). #79: N-para-N via RLS.
  const isOwner = repertoire.ownerId === user.id;
  const [{ data: canCoEdit }, { data: inGroup }, isFavorite] = await Promise.all([
    supabase.rpc("edits_repertoire_group", { p_rep: id }),
    supabase.rpc("in_repertoire_group", { p_rep: id }),
    isRepertoireFavorite(supabase, user.id, id),
  ]);
  const canEdit = isOwner || canCoEdit === true;
  // "Meu" = dono OU membro de algum grupo vinculado → posso favoritar (pessoal, por usuário).
  const isMine = isOwner || inGroup === true;
  // Repertório da comunidade que não é meu → posso "pegar" (clonar) para os meus.
  const canTake = !isOwner && repertoire.communityStatus === "approved";
  // Breadcrumb reflete de onde vim (fila de moderação, aba comunidade, ou a lista padrão).
  let originCrumb = { label: "Repertórios", href: "/repertorios" };
  if (from === "moderacao") originCrumb = { label: "Moderação", href: "/moderacao" };
  else if (from === "comunidade") originCrumb = { label: "Comunidade", href: "/repertorios?aba=comunidade" };

  const header = (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 12px" }}>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Breadcrumb items={[originCrumb, { label: pkg.repertoire.title }]} />
      </div>
      <span className="flex flex-wrap items-center gap-2">
        {isMine && (
          <FavoriteStar repertoireId={id} userId={user.id} initialFavorite={isFavorite} />
        )}
        <a href={`/repertorios/${id}/ao-vivo`} className="btn">
          Ao vivo
        </a>
        <a href={`/repertorios/${id}/projecao`} className="btn">
          Projeção
        </a>
        {canEdit && <EditPencil href={`/repertorios/${id}/editar`} />}
        {canTake && <TakeRepertoireButton sourceId={id} userId={user.id} />}
      </span>
    </div>
  );

  return (
    <PublicRepertoire pkg={pkg} header={header} editableByUserId={user.id} repertoireId={id} />
  );
}
