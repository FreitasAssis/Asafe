import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getSong, listTags } from "@/lib/songs";
import { SongEditor } from "@/components/song-editor";

export default async function EditarMusica({
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

  return <SongEditor userId={user.id} tags={tags} song={song} />;
}
