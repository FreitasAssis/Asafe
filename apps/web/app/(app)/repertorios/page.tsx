import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { listRepertoires } from "@/lib/repertoires";
import { Fab } from "@/components/fab";
import { RepertoireList } from "@/components/repertoire-list";

export default async function Repertorios() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const repertoires = await listRepertoires(supabase);

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1 style={{ marginTop: 0 }}>Repertórios</h1>
      <Fab href="/repertorios/novo" label="Novo repertório" />
      <RepertoireList items={repertoires} userId={user.id} />
    </main>
  );
}
