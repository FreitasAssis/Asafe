import type { RepertoireType } from "@asafe/core";

export default function Home() {
  // Prova de fumaça: o app web consome o pacote @asafe/core do monorepo.
  const exemplo: RepertoireType = "Missa";

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>Asafe 🎵</h1>
      <p>
        Organize e compartilhe repertórios de música litúrgica católica.
        Em construção — veja <code>PLANNING.md</code>.
      </p>
      <p style={{ color: "#666" }}>
        Tipo de repertório de exemplo (de <code>@asafe/core</code>): {exemplo}
      </p>
    </main>
  );
}
