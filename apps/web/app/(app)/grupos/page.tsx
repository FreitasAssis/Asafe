import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { listGroups } from "@/lib/groups";
import { NewGroupForm } from "@/components/new-group-form";

export default async function Grupos() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const groups = await listGroups(supabase);

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Grupos</h1>

      {groups.length === 0 ? (
        <p style={{ color: "#888" }}>Você ainda não participa de grupos. Crie o primeiro!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {groups.map((g) => (
            <li key={g.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <a href={`/grupos/${g.id}`} style={{ fontSize: 17, fontWeight: 600 }}>
                {g.name}
              </a>
              {g.ownerId === user.id && <span style={{ color: "#888" }}> (dono)</span>}
            </li>
          ))}
        </ul>
      )}

      <NewGroupForm userId={user.id} />
    </main>
  );
}
