/** Lápis que leva à edição. Renderize só quando o usuário pode editar. */
export function EditPencil({ href }: { readonly href: string }) {
  return (
    <a
      href={href}
      title="Editar"
      aria-label="Editar"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        border: "1px solid var(--primary)",
        borderRadius: 6,
        color: "var(--primary)",
        textDecoration: "none",
        fontSize: 14,
        whiteSpace: "nowrap",
      }}
    >
      ✏️ Editar
    </a>
  );
}
