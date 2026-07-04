import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { listSongs, listTags } from "@/lib/songs";
import { Catalog } from "@/components/catalog";

export default async function MusicasCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [songs, tags] = await Promise.all([listSongs(supabase), listTags(supabase)]);
  return (
    <Catalog
      songs={songs}
      tags={tags}
      userId={user.id}
      initialTab={aba === "comunidade" ? "comunidade" : "meus"}
    />
  );
}
