import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { liturgicalColorHex, REPERTOIRE_TYPE_LABELS } from "@asafe/core";
import { serverClient } from "@/lib/supabase/server";
import { listRepertoires } from "@/lib/repertoires";
import { PREFS_COOKIE, parsePrefs } from "@/lib/preferences";
import { WelcomeCard } from "@/components/welcome-card";

/** Home: mini-painel — próximo repertório, repertórios recentes e atalhos. */
export default async function Home() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (user.user_metadata?.display_name as string | undefined)?.trim() || user.email!;
  const welcomeDismissed = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value).welcomeDismissed;

  const reps = await listRepertoires(supabase);
  const today = new Date().toISOString().slice(0, 10);
  const next =
    reps
      .filter((r) => r.date && r.date >= today)
      .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? -1 : 1))[0] ?? null;
  const recent = reps.slice(0, 4);

  const acoes = (
    <div className="mt-6 flex flex-wrap gap-2">
      <a href="/repertorios/novo" className="btn btn-primary">
        + Novo repertório
      </a>
      <a href="/musicas/nova" className="btn">
        + Nova música
      </a>
    </div>
  );

  return (
    <main className="mx-auto my-8 max-w-2xl px-4">
      {!welcomeDismissed && <WelcomeCard />}
      <h1 className="mt-0 font-serif text-3xl font-semibold">Olá, {name}</h1>

      {reps.length === 0 ? (
        <>
          <p className="mt-2 text-muted">
            Comece criando seu primeiro repertório ou adicionando uma música ao catálogo.
          </p>
          {acoes}
        </>
      ) : (
        <>
          {next && (
            <a href={`/repertorios/${next.id}`} className="card mt-4 block hover:border-primary">
              <div className="text-xs uppercase tracking-wide text-muted">Próximo</div>
              <div className="mt-1 font-serif text-lg font-semibold">{next.title}</div>
              <div className="text-sm text-muted">
                {REPERTOIRE_TYPE_LABELS[next.type]}
                {next.date ? ` · ${next.date}` : ""}
              </div>
            </a>
          )}

          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-semibold">Repertórios</h2>
              <a href="/repertorios" className="text-sm">
                ver todos →
              </a>
            </div>
            <ul className="mt-2 list-none p-0">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-2 border-b border-border py-2">
                  {liturgicalColorHex(r.liturgicalColor) && (
                    <span
                      title="Cor litúrgica do dia"
                      className="inline-block shrink-0 rounded-full border border-border"
                      style={{ width: 10, height: 10, background: liturgicalColorHex(r.liturgicalColor)! }}
                    />
                  )}
                  <span>
                    <a href={`/repertorios/${r.id}`} className="font-semibold">
                      {r.title}
                    </a>
                    <span className="text-muted">
                      {" "}
                      — {REPERTOIRE_TYPE_LABELS[r.type]}
                      {r.date ? ` · ${r.date}` : ""}
                      {r.groupName ? ` · 👥 ${r.groupName}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {acoes}
        </>
      )}
    </main>
  );
}
