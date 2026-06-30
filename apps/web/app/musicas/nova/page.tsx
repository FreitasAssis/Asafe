import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { SongEditor } from "@/components/song-editor";

export default async function NovaMusica() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <SongEditor userId={user.id} />;
}
