import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getSong, listTags } from "@/lib/songs";
import { findAuthorizedSource } from "@/lib/authorized-sources";
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

  // Vínculo com fonte autorizada (C10): sinaliza ao moderador que o autor tem permissão em bloco.
  const authorizedSource = await findAuthorizedSource(supabase, song.composer);

  // Só o dono edita a música (RLS song_write_own).
  const canEdit = song.ownerId === user.id;
  // Breadcrumb reflete de onde vim (fila de moderação, aba comunidade, ou o catálogo padrão).
  let origin = { label: "Catálogo", href: "/musicas" };
  if (from === "moderacao") origin = { label: "Moderação", href: "/moderacao" };
  else if (from === "comunidade") origin = { label: "Comunidade", href: "/musicas?aba=comunidade" };
  return (
    <SongView
      song={song}
      tags={tags}
      canEdit={canEdit}
      origin={origin}
      authorizedSource={authorizedSource}
    />
  );
}
