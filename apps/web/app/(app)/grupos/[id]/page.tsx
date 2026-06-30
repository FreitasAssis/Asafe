import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getGroup, groupMembers, listInvites, listJoinRequests } from "@/lib/groups";
import { GroupDetail } from "@/components/group-detail";

export default async function GrupoDetalhe({
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

  const group = await getGroup(supabase, id);
  if (!group) notFound();

  const isOwner = group.ownerId === user.id;
  const [members, requests, invites] = await Promise.all([
    groupMembers(supabase, group.id),
    isOwner ? listJoinRequests(supabase, group.id) : Promise.resolve([]),
    isOwner ? listInvites(supabase, group.id) : Promise.resolve([]),
  ]);

  return (
    <GroupDetail
      group={group}
      members={members}
      requests={requests}
      invites={invites}
      isOwner={isOwner}
      currentUserId={user.id}
    />
  );
}
