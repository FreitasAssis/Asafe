import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getSong, listTags } from "@/lib/songs";
import { SongView } from "@/components/song-view";

export default async function VerMusica({
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

  const [song, tags] = await Promise.all([getSong(supabase, id), listTags(supabase)]);
  if (!song) notFound();

  // Só o dono edita a música (RLS song_write_own).
  const canEdit = song.ownerId === user.id;
  const origin =
    from === "moderacao"
      ? { label: "Moderação", href: "/moderacao" }
      : { label: "Catálogo", href: "/musicas" };
  return <SongView song={song} tags={tags} canEdit={canEdit} origin={origin} />;
}
