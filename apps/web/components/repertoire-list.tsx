"use client";

import { useRouter } from "next/navigation";
import { REPERTOIRE_TYPE_LABELS } from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { deleteRepertoire, type RepertoireListItem } from "@/lib/repertoires";
import { RowActions } from "@/components/row-actions";
import { StatusBadge } from "@/components/status-badge";

/** Lista de repertórios com ações por linha (lápis/lixeira só para o dono). */
export function RepertoireList({
  items,
  userId,
}: {
  readonly items: RepertoireListItem[];
  readonly userId: string;
}) {
  const router = useRouter();

  if (items.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>Você ainda não tem repertórios. Crie o primeiro!</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {items.map((r) => (
        <li
          key={r.id}
          style={{
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <a href={`/repertorios/${r.id}`} style={{ fontSize: 17, fontWeight: 600 }}>
              {r.title}
            </a>
            <span style={{ color: "var(--text-muted)" }}>
              {" "}
              — {REPERTOIRE_TYPE_LABELS[r.type]}
              {r.date ? ` · ${r.date}` : ""}
              {r.groupName ? ` · 👥 ${r.groupName}` : ""}
            </span>
            {r.ownerId === userId && (
              <>
                {" "}
                <StatusBadge status={r.communityStatus} />
              </>
            )}
          </div>
          {r.ownerId === userId && (
            <RowActions
              editHref={`/repertorios/${r.id}/editar`}
              confirmText={`Excluir "${r.title}"?`}
              onDelete={async () => {
                await deleteRepertoire(browserClient(), r.id);
                router.refresh();
              }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
