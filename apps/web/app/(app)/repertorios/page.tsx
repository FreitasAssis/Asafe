import { redirect } from "next/navigation";
import { REPERTOIRE_TYPE_LABELS } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { listRepertoires } from "@/lib/repertoires";
import { Fab } from "@/components/fab";

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

      {repertoires.length === 0 ? (
        <p style={{ color: "#888" }}>Você ainda não tem repertórios. Crie o primeiro!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {repertoires.map((r) => (
            <li key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <a href={`/repertorios/${r.id}`} style={{ fontSize: 17, fontWeight: 600 }}>
                {r.title}
              </a>
              <span style={{ color: "#888" }}>
                {" "}
                — {REPERTOIRE_TYPE_LABELS[r.type]}
                {r.date ? ` · ${r.date}` : ""}
                {r.groupName ? ` · 👥 ${r.groupName}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
