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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handle(action: "entrar" | "criar") {
    setError(null);
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
    router.push("/");
    router.refresh();
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
      <input
        type="password"
        placeholder="senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        className="input"
      />

      {error && <p className="m-0 text-danger">{error}</p>}

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
    </form>
  );
}
