import { redirect } from "next/navigation";
import {
  COMMUNITY_STATUS_LABELS,
  latestEventPerTarget,
  MODERATION_REASON_LABELS,
  REPERTOIRE_TYPE_LABELS,
  type CommunityStatus,
  type ModerationEventLite,
} from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { listMyModerationEvents } from "@/lib/community";
import { listRepertoires } from "@/lib/repertoires";
import { listSongs } from "@/lib/songs";
import { StatusBadge } from "@/components/status-badge";

interface Submission {
  id: string;
  kind: "song" | "repertoire";
  href: string;
  title: string;
  subtitle: string;
  status: CommunityStatus;
  feedback: ModerationEventLite | null;
}

// Actionable (precisa do proponente) primeiro; depois pendentes; publicados por último.
const STATUS_ORDER: Record<CommunityStatus, number> = {
  returned: 0,
  rejected: 1,
  pending: 2,
  approved: 3,
  none: 4,
};

export default async function MeusEnvios() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [songs, repertoires] = await Promise.all([listSongs(supabase), listRepertoires(supabase)]);

  const sent: Omit<Submission, "feedback">[] = [
    ...songs
      .filter((s) => s.ownerId === user.id && s.communityStatus !== "none")
      .map((s) => ({
        id: s.id,
        kind: "song" as const,
        href: `/musicas/${s.id}`,
        title: s.title,
        subtitle: s.composer ? `Música · ${s.composer}` : "Música",
        status: s.communityStatus,
      })),
    ...repertoires
      .filter((r) => r.ownerId === user.id && r.communityStatus !== "none")
      .map((r) => ({
        id: r.id,
        kind: "repertoire" as const,
        href: `/repertorios/${r.id}`,
        title: r.title,
        subtitle: `Repertório · ${REPERTOIRE_TYPE_LABELS[r.type]}${r.date ? ` · ${r.date}` : ""}`,
        status: r.communityStatus,
      })),
  ];

  // Devolutiva só interessa aos devolvidos/rejeitados — busca em lote e pega o último por alvo.
  const feedbackIds = sent
    .filter((x) => x.status === "returned" || x.status === "rejected")
    .map((x) => x.id);
  const latest = latestEventPerTarget(await listMyModerationEvents(supabase, feedbackIds));

  const submissions: Submission[] = sent
    .map((x) => ({ ...x, feedback: latest.get(x.id) ?? null }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.title.localeCompare(b.title));

  return (
    <main className="mx-auto my-6 max-w-3xl px-4">
      <h1 className="mt-0 font-serif text-3xl font-semibold">Meus envios</h1>
      <p className="mt-1 text-sm text-muted">
        Acompanhe o que você sugeriu à comunidade — {COMMUNITY_STATUS_LABELS.pending.toLowerCase()},
        publicado, devolvido ou não aprovado — e o retorno da moderação.
      </p>

      {submissions.length === 0 ? (
        <p className="mt-6 text-muted">
          Você ainda não sugeriu nada à comunidade. Abra uma música ou repertório e use “Sugerir à
          comunidade”.
        </p>
      ) : (
        <ul className="mt-4 list-none p-0">
          {submissions.map((x) => (
            <li key={`${x.kind}-${x.id}`} className="border-b border-border py-3">
              <div className="flex flex-wrap items-center gap-2">
                <a href={x.href} className="font-semibold">
                  {x.title}
                </a>
                <StatusBadge status={x.status} />
                <span className="flex-1 text-xs text-muted">{x.subtitle}</span>
              </div>
              {x.feedback && (x.feedback.reason || x.feedback.note) && (
                <div
                  className="mt-2 rounded p-2 text-sm"
                  style={{ color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" }}
                >
                  <strong>Retorno da moderação</strong>
                  {x.feedback.reason && (
                    <p className="mt-1">Motivo: {MODERATION_REASON_LABELS[x.feedback.reason]}</p>
                  )}
                  {x.feedback.note && <p className="mt-1 whitespace-pre-line">{x.feedback.note}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
