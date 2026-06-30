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
        border: "1px solid #2563eb",
        borderRadius: 6,
        color: "#2563eb",
        textDecoration: "none",
        fontSize: 14,
        whiteSpace: "nowrap",
      }}
    >
      ✏️ Editar
    </a>
  );
}
