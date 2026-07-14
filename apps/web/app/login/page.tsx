import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

/** Rota "/login" — fina: só monta o formulário. `next` = para onde voltar após autenticar. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <div className="flex flex-col items-center text-center">
        <Brand size={64} stacked />
        <p className="mb-6 mt-3 text-muted">Entre para montar seus repertórios.</p>
      </div>
      <LoginForm next={next} />
      <p className="mt-8 text-center text-sm text-muted">
        <a href="/sobre">Sobre o Asafe</a>
      </p>
    </main>
  );
}
