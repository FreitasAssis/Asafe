import { toHtml } from "@asafe/chordpro";

/**
 * Render de uma cifra ChordPro como HTML (acordes sobre a letra). Componente "burro":
 * recebe o ChordPro já pronto para exibir; quem decide transpor/esconder é o editor.
 * Reutilizável depois na página pública SSR de leitura.
 */
export function ChordPreview({ chordpro }: { chordpro: string }) {
  const html = chordpro.trim() ? toHtml(chordpro) : "";
  if (!html) {
    return <p style={{ color: "var(--text-muted)" }}>O preview da cifra aparece aqui.</p>;
  }
  return (
    <div
      className="chord-preview"
      // Conteúdo gerado pelo ChordSheetJS (divs com classes), a partir da cifra do usuário.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
