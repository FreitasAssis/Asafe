import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

/** Rota "/login" — fina: só monta o formulário. */
export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <div className="flex flex-col items-center text-center">
        <Brand size={64} stacked />
        <p className="mb-6 mt-3 text-muted">Entre para montar seus repertórios.</p>
      </div>
      <LoginForm />
    </main>
  );
}
