import type { Metadata } from "next";
import { anonClient } from "@/lib/supabase/anon";
import { PublicRepertoire, type SharedPackage } from "@/components/public-repertoire";

/** Busca o pacote do repertório pelo token (RPC security definer; null se inválido/expirado). */
async function loadShared(token: string): Promise<SharedPackage | null> {
  const { data, error } = await anonClient().rpc("get_shared_repertoire_full", {
    p_token: token,
  });
  if (error) return null;
  return (data as SharedPackage | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const pkg = await loadShared(token);
  return { title: pkg ? `${pkg.repertoire.title} — Asafe` : "Repertório — Asafe" };
}

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pkg = await loadShared(token);

  if (!pkg) {
    return (
      <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
        <h1>Link inválido ou expirado</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Este link de repertório não existe mais ou passou da validade. Peça um novo a quem
          compartilhou.
        </p>
      </main>
    );
  }

  return <PublicRepertoire pkg={pkg} />;
}
