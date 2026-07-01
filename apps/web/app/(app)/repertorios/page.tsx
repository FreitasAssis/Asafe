import { redirect } from "next/navigation";
import { REPERTOIRE_TYPE_LABELS } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { listCommunityRepertoires, listRepertoires } from "@/lib/repertoires";
import { Fab } from "@/components/fab";
import { RepertoireList } from "@/components/repertoire-list";

function tabClass(active: boolean) {
  return active
    ? "border-b-2 border-primary px-3 py-2 font-semibold text-ink"
    : "px-3 py-2 text-muted";
}

export default async function Repertorios({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const community = aba === "comunidade";
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const comm = community ? await listCommunityRepertoires(supabase) : [];
  const mine = community ? [] : await listRepertoires(supabase);

  return (
    <main className="mx-auto my-6 max-w-3xl px-4">
      <h1 className="mt-0 font-serif text-3xl font-semibold">Repertórios</h1>

      <div className="mt-3 flex gap-1 border-b border-border">
        <a href="/repertorios" className={tabClass(!community)}>
          Meus
        </a>
        <a href="/repertorios?aba=comunidade" className={tabClass(community)}>
          Comunidade
        </a>
      </div>

      {community ? (
        comm.length === 0 ? (
          <p className="mt-4 text-muted">Nenhum repertório na comunidade ainda.</p>
        ) : (
          <ul className="mt-2 list-none p-0">
            {comm.map((r) => (
              <li key={r.id} className="border-b border-border py-2">
                <a href={`/repertorios/${r.id}`} className="font-semibold">
                  {r.title}
                </a>
                <span className="text-muted">
                  {" "}
                  — {REPERTOIRE_TYPE_LABELS[r.type]}
                  {r.date ? ` · ${r.date}` : ""} · por {r.authorName ?? r.authorEmail}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <Fab href="/repertorios/novo" label="Novo repertório" />
          <RepertoireList items={mine} userId={user.id} />
        </>
      )}
    </main>
  );
}
