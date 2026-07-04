"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import {
  createAuthorizedSource,
  deleteAuthorizedSource,
  type AuthorizedSource,
} from "@/lib/authorized-sources";

function isUrl(s: string) {
  return /^https?:\/\//.test(s);
}

/** Gestão das fontes autorizadas (C10), na tela de Moderação. Só moderador vê/usa (RLS). */
export function AuthorizedSources({
  initial,
  userId,
}: {
  readonly initial: AuthorizedSource[];
  readonly userId: string;
}) {
  const router = useRouter();
  const [composer, setComposer] = useState("");
  const [publisher, setPublisher] = useState("");
  const [evidence, setEvidence] = useState("");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = Boolean(composer.trim() && evidence.trim()) && !busy;

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await createAuthorizedSource(browserClient(), userId, {
        composer,
        publisher: publisher || null,
        evidence,
        scope: scope || null,
      });
      setComposer("");
      setPublisher("");
      setEvidence("");
      setScope("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta fonte autorizada?")) return;
    try {
      await deleteAuthorizedSource(browserClient(), id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  return (
    <div>
      <p className="mt-1 text-sm text-muted">
        Permissão em bloco de um compositor/editora. Ao sugerir, músicas desse autor propõem{" "}
        <strong>permissão</strong> (não protegida) — sempre com sua revisão.
      </p>

      <div className="mt-3 grid gap-2 rounded border border-border p-3 sm:grid-cols-2">
        <input
          className="input text-sm"
          placeholder="Compositor / autor *"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
        />
        <input
          className="input text-sm"
          placeholder="Editora (opcional)"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
        />
        <input
          className="input text-sm sm:col-span-2"
          placeholder="Evidência da permissão (link ou nota) *"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
        />
        <input
          className="input text-sm sm:col-span-2"
          placeholder="Escopo (ex.: todas as obras; álbum X) — opcional"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />
        <div className="sm:col-span-2">
          <button type="button" className="btn btn-primary" disabled={!canAdd} onClick={() => void add()}>
            {busy ? "Registrando…" : "Registrar fonte"}
          </button>
          {error && <span className="ml-2 text-sm" style={{ color: "var(--danger)" }}>{error}</span>}
        </div>
      </div>

      {initial.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nenhuma fonte autorizada registrada.</p>
      ) : (
        <ul className="mt-3 list-none p-0">
          {initial.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 text-sm">
              <span className="font-semibold">{s.composer}</span>
              {s.publisher && <span className="text-muted">· {s.publisher}</span>}
              {isUrl(s.evidence) ? (
                <a href={s.evidence} target="_blank" rel="noreferrer">
                  evidência ↗
                </a>
              ) : (
                <span className="text-muted">· {s.evidence}</span>
              )}
              {s.scope && <span className="text-muted">· {s.scope}</span>}
              <button
                type="button"
                className="ml-auto text-xs"
                style={{ color: "var(--danger)" }}
                onClick={() => void remove(s.id)}
              >
                remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
