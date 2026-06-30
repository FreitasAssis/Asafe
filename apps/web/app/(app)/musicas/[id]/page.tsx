import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getSong, listTags } from "@/lib/songs";
import { SongView } from "@/components/song-view";

export default async function VerMusica({
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

  const [song, tags] = await Promise.all([getSong(supabase, id), listTags(supabase)]);
  if (!song) notFound();

  // Só o dono edita a música (RLS song_write_own).
  const canEdit = song.ownerId === user.id;
  return <SongView song={song} tags={tags} canEdit={canEdit} />;
}
