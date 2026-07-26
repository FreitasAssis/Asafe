"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";

/** Traduz as mensagens de erro mais comuns do Supabase Auth para português. */
function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Este e-mail já tem conta — tente entrar.";
  if (m.includes("password should be at least"))
    return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("invalid format")) return "E-mail inválido.";
  return msg;
}

export function LoginForm({ next }: { readonly next?: string }) {
  const router = useRouter();
  // Só aceita caminho interno (evita open-redirect); senão vai pra home.
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handle(action: "entrar" | "criar") {
    setError(null);
    setNotice(null);
    // "Criar conta" é um botão (não dispara a validação nativa): exige nome, e-mail e senha.
    if (action === "criar" && (!name.trim() || !email.trim() || !password)) {
      setError("Para criar conta, preencha nome, e-mail e senha.");
      return;
    }
    setLoading(true);
    const supabase = browserClient();
    const { error } =
      action === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: name.trim() } },
          });
    setLoading(false);
    if (error) {
      setError(traduzErro(error.message));
      return;
    }
    router.push(dest);
    router.refresh();
  }

  async function handleReset() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Digite seu e-mail para receber o link de redefinição.");
      return;
    }
    setLoading(true);
    const supabase = browserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/redefinir-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      setError(traduzErro(error.message));
      return;
    }
    setNotice("Enviamos um link para redefinir sua senha. Confira seu e-mail.");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handle("entrar");
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="text"
        placeholder="seu nome (ao criar conta)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        className="input"
      />
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        className="input"
      />
      <PasswordInput
        value={password}
        onChange={setPassword}
        placeholder="senha"
        autoComplete="current-password"
        required
      />

      {error && <p className="m-0 text-danger">{error}</p>}
      {notice && (
        <p className="m-0" style={{ color: "var(--season)" }}>
          {notice}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          Entrar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handle("criar")}
          className="btn flex-1"
        >
          Criar conta
        </button>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleReset()}
        className="mt-1 self-center text-sm text-muted"
        style={{ background: "none", border: 0, cursor: "pointer" }}
      >
        Esqueci a senha
      </button>
    </form>
  );
}
