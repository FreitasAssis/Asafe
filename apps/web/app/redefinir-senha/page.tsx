"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { Brand } from "@/components/brand";
import { PasswordInput } from "@/components/password-input";

/**
 * Redefinir senha: o usuário chega aqui pelo link do e-mail (após o /auth/callback trocar o
 * code por uma sessão de recuperação). Define a nova senha e entra logado. Sem sessão válida
 * (link expirado/aberto em outro dispositivo) mostra aviso.
 */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void browserClient()
      .auth.getUser()
      .then(({ data }) => setState(data.user ? "ok" : "invalid"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) {
      setError("A senha precisa de pelo menos 6 caracteres.");
      return;
    }
    if (pw !== pw2) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await browserClient().auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/inicio");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <div className="flex flex-col items-center text-center">
        <Brand size={64} stacked />
        <p className="mb-6 mt-3 text-muted">Defina sua nova senha.</p>
      </div>

      {state === "checking" && <p className="text-center text-muted">Verificando o link…</p>}

      {state === "invalid" && (
        <div className="text-center">
          <p className="text-danger">Este link é inválido ou expirou.</p>
          <p className="mt-4 text-sm">
            <a href="/login">Voltar e pedir um novo link</a>
          </p>
        </div>
      )}

      {state === "ok" &&
        (done ? (
          <p className="text-center" style={{ color: "var(--season)" }}>
            Senha alterada! Entrando…
          </p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
            <PasswordInput
              value={pw}
              onChange={setPw}
              placeholder="nova senha"
              autoComplete="new-password"
              required
            />
            <PasswordInput
              value={pw2}
              onChange={setPw2}
              placeholder="repita a nova senha"
              autoComplete="new-password"
              required
            />
            {error && <p className="m-0 text-danger">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary">
              Salvar nova senha
            </button>
          </form>
        ))}
    </main>
  );
}
