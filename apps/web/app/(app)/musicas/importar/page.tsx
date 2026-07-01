import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { listTags } from "@/lib/songs";
import { ImportSongs } from "@/components/import-songs";

export const metadata = { title: "Importar músicas — Asafe" };

export default async function ImportarMusicas() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tags = await listTags(supabase);
  return <ImportSongs userId={user.id} tags={tags} />;
}
