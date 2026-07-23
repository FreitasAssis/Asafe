import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getSong, listTags } from "@/lib/songs";
import { SongEditor } from "@/components/song-editor";

export default async function EditarMusica({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [song, tags] = await Promise.all([getSong(supabase, id), listTags(supabase)]);
  if (!song) notFound();

  // "voltar" retorna à origem (ex.: o repertório em visualização) quando é um
  // caminho interno seguro; senão cai no fluxo padrão do editor.
  const backHref = back?.startsWith("/") && !back.startsWith("//") ? back : undefined;

  return <SongEditor userId={user.id} tags={tags} song={song} backHref={backHref} />;
}
