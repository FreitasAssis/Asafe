import { LoginForm } from "@/components/login-form";

/** Rota "/login" — fina: só monta o formulário. */
export default function LoginPage() {
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Asafe 🎵</h1>
      <p style={{ color: "#666" }}>Entre para montar seus repertórios.</p>
      <LoginForm />
    </main>
  );
}
