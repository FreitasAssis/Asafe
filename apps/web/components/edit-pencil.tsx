/** Lápis que leva à edição. Renderize só quando o usuário pode editar. */
export function EditPencil({ href }: { readonly href: string }) {
  return (
    <a
      href={href}
      title="Editar"
      aria-label="Editar"
      className="btn"
      style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
    >
      ✏️ Editar
    </a>
  );
}
