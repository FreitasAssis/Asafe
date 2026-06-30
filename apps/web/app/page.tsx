import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

/** Rota "/" — shell logado. Sem sessão, o middleware já manda para /login;
 * confirmamos aqui por defesa em profundidade. Catálogo e editor chegam na fatia C. */
export default async function Home() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Asafe 🎵</h1>
        <SignOutButton />
      </div>
      <p>
        Olá, <strong>{user.email}</strong> — você está dentro.
      </p>
      <p style={{ display: "flex", gap: 10 }}>
        <a
          href="/musicas"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Meu catálogo
        </a>
        <a
          href="/musicas/nova"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            border: "1px solid #2563eb",
            color: "#2563eb",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          + Nova música
        </a>
      </p>
    </main>
  );
}
