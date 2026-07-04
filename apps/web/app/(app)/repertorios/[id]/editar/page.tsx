import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getRepertoire, slotTemplate } from "@/lib/repertoires";
import { listSongs, listTags } from "@/lib/songs";
import { listShareLinks } from "@/lib/share-links";
import { listGroups } from "@/lib/groups";
import { RepertoireBuilder } from "@/components/repertoire-builder";

export default async function MontarRepertorio({
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

  const repertoire = await getRepertoire(supabase, id);
  if (!repertoire) notFound();

  const isOwner = repertoire.ownerId === user.id;
  const [template, songs, tags, shareLinks, groups] = await Promise.all([
    slotTemplate(supabase, repertoire.type),
    listSongs(supabase),
    listTags(supabase),
    isOwner ? listShareLinks(supabase, repertoire.id) : Promise.resolve([]),
    isOwner ? listGroups(supabase) : Promise.resolve([]),
  ]);

  return (
    <RepertoireBuilder
      repertoire={repertoire}
      template={template}
      songs={songs}
      tags={tags}
      shareLinks={shareLinks}
      isOwner={isOwner}
      userId={user.id}
      groups={groups}
    />
  );
}
