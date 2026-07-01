import { notFound, redirect } from "next/navigation";
import { REPERTOIRE_TYPE_LABELS } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { isModerator, listPendingRequests } from "@/lib/repertoires";
import { listPendingSongs } from "@/lib/songs";
import { ModerationList } from "@/components/moderation-list";

export const metadata = { title: "Moderação — Asafe" };

export default async function Moderacao() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isModerator(supabase))) notFound();

  const [reps, songs] = await Promise.all([
    listPendingRequests(supabase),
    listPendingSongs(supabase),
  ]);

  return (
    <main className="mx-auto my-8 max-w-2xl px-4">
      <h1 className="mt-0 font-serif text-3xl font-semibold">Moderação</h1>
      <p className="mt-2 text-muted">
        Pedidos para publicar na comunidade. Revise antes de aprovar — o conteúdo entra no catálogo
        global.
      </p>

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">Repertórios</h2>
        <ModerationList
          kind="repertoire"
          items={reps.map((r) => ({
            id: r.id,
            title: r.title,
            subtitle: `${REPERTOIRE_TYPE_LABELS[r.type]} · por ${r.ownerName ?? r.ownerEmail}`,
          }))}
        />
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold">Músicas</h2>
        <ModerationList
          kind="song"
          items={songs.map((s) => ({
            id: s.id,
            title: s.title,
            subtitle: `por ${s.ownerName ?? s.ownerEmail}`,
          }))}
        />
      </section>
    </main>
  );
}
