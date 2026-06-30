import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

/** Rota "/" — saudação enxuta; a navegação agora vive na sidebar. */
export default async function Home() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = (user.user_metadata?.display_name as string | undefined)?.trim() || user.email!;

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1 style={{ marginTop: 0 }}>Asafe 🎵</h1>
      <p>
        Olá, <strong>{name}</strong> — você está dentro.
      </p>
      <p style={{ color: "var(--text-muted)" }}>
        Use o menu ao lado para abrir seu <a href="/musicas">catálogo</a>, seus{" "}
        <a href="/repertorios">repertórios</a> ou seus <a href="/grupos">grupos</a>.
      </p>
    </main>
  );
}
