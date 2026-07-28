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

export function LoginForm({
  next,
  intent = "entrar",
}: {
  readonly next?: string;
  /** Ação em destaque (vinda da landing): "criar" chega de "Criar conta", "entrar" de "Entrar". */
  readonly intent?: "entrar" | "criar";
}) {
  const router = useRouter();
  // Só aceita caminho interno (evita open-redirect); senão vai pra home do app.
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/inicio";
  const LABEL = { entrar: "Entrar", criar: "Criar conta" } as const;
  const SUBTITLE = {
    entrar: "Entre para montar seus repertórios.",
    criar: "Crie sua conta para montar seus repertórios.",
  } as const;
  // Modo atual da tela (nasce do CTA da landing; o botão secundário alterna).
  const [mode, setMode] = useState<"entrar" | "criar">(intent);
  const secondary = mode === "criar" ? "entrar" : "criar";
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

  /** Botão secundário alterna o modo (revela/esconde o nome) em vez de submeter. */
  function switchMode() {
    setError(null);
    setNotice(null);
    setMode(secondary);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handle(mode);
      }}
      className="flex flex-col gap-3"
    >
      <p className="m-0 text-center text-muted">{SUBTITLE[mode]}</p>
      {mode === "criar" && (
        <input
          type="text"
          placeholder="seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="input"
        />
      )}
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
        autoComplete={mode === "criar" ? "new-password" : "current-password"}
        required
      />

      {error && <p className="m-0 text-danger">{error}</p>}
      {notice && (
        <p className="m-0" style={{ color: "var(--season)" }}>
          {notice}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {LABEL[mode]}
      </button>
      <p className="m-0 text-center text-sm text-muted">
        {mode === "criar" ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
        <button
          type="button"
          disabled={loading}
          onClick={switchMode}
          className="text-primary"
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
        >
          {LABEL[secondary]}
        </button>
      </p>

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
