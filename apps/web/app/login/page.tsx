import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

/**
 * Rota "/login" — fina: só monta o formulário. `next` = para onde voltar após autenticar.
 * `criar` (vindo do CTA da landing) coloca "Criar conta" em destaque e ajusta o texto.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; criar?: string }>;
}) {
  const { next, criar } = await searchParams;
  const intent = criar !== undefined ? "criar" : "entrar";
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <div className="flex flex-col items-center text-center">
        <Brand size={64} stacked />
        <p className="mb-6 mt-3 text-muted">
          {intent === "criar"
            ? "Crie sua conta para montar seus repertórios."
            : "Entre para montar seus repertórios."}
        </p>
      </div>
      <LoginForm next={next} intent={intent} />
      <p className="mt-8 text-center text-sm text-muted">
        <a href="/sobre">Sobre o Asafe</a>
      </p>
    </main>
  );
}
