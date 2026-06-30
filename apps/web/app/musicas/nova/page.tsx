import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { listTags } from "@/lib/songs";
import { SongEditor } from "@/components/song-editor";

export default async function NovaMusica() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tags = await listTags(supabase);
  return <SongEditor userId={user.id} tags={tags} />;
}
