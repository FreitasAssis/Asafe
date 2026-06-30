"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";

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

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handle(action: "entrar" | "criar") {
    setLoading(true);
    setError(null);
    const supabase = browserClient();
    const { error } =
      action === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(traduzErro(error.message));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handle("entrar");
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        style={{ padding: 10, fontSize: 16 }}
      />
      <input
        type="password"
        placeholder="senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        style={{ padding: 10, fontSize: 16 }}
      />

      {error && <p style={{ color: "#c00", margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={loading} style={{ flex: 1, padding: 10 }}>
          Entrar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handle("criar")}
          style={{ flex: 1, padding: 10 }}
        >
          Criar conta
        </button>
      </div>
    </form>
  );
}
