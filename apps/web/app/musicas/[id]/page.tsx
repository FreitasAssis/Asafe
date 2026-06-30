import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getSong } from "@/lib/songs";
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

  const song = await getSong(supabase, id);
  if (!song) notFound();

  return <SongEditor userId={user.id} song={song} />;
}
