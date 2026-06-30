/** Botão de ação flutuante (FAB): "+" redondo fixo no canto inferior direito. */
export function Fab({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <a href={href} className="app-fab" aria-label={label} title={label}>
      +
    </a>
  );
}
