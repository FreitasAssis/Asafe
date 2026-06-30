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
      <p style={{ color: "#888" }}>
        Seu catálogo e o editor de cifras chegam na próxima etapa.
      </p>
    </main>
  );
}
