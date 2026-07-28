import { Brand } from "@/components/brand";

/**
 * Conteúdo da landing/apresentação do Asafe. Reutilizado na raiz "/" (visitante deslogado)
 * e em "/sobre". Ordem: hero + CTA → o que faz → comunidade → gratuito → a história do nome →
 * open source.
 */
export function LandingContent() {
  return (
    <main className="mx-auto my-10 max-w-2xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <a href="/" aria-label="Início">
          <Brand size={72} stacked />
        </a>
        <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight">
          Prepare a música da celebração
        </h1>
        <p className="mt-2 text-muted">Do ensaio ao altar, com a sua equipe.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a href="/login?criar=1" className="btn btn-primary">
            Criar conta
          </a>
          <a href="/login" className="btn">
            Entrar
          </a>
        </div>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted">· grátis e open source ·</p>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">O que é</h2>
        <p className="mt-2 leading-relaxed">
          O Asafe ajuda ministérios de música a{" "}
          <strong>preparar a música da celebração</strong> — do ensaio ao altar.
        </p>
        <ul className="mt-3 flex list-none flex-col gap-2 p-0 leading-relaxed">
          <li>
            <strong>Repertórios por momento</strong> — monte a celebração na ordem do rito, com
            músicas do seu catálogo ou dos seus grupos.
          </li>
          <li>
            <strong>Catálogo</strong> — guarde cifras e letras em ChordPro, transponha o tom e
            esconda a cifra quando quiser.
          </li>
          <li>
            <strong>Liturgia do dia</strong> — numa Missa com data, traz as leituras e o salmo do
            dia, ajusta os momentos ao tempo litúrgico e sugere músicas ligadas às leituras.
          </li>
          <li>
            <strong>Ao vivo &amp; Projeção</strong> — toque em tela cheia (transpor, autoscroll,
            refrão) e projete a letra em slides; no modo sincronizado, um mestre conduz todos.
          </li>
          <li>
            <strong>Grupos &amp; compartilhamento</strong> — divida repertórios com a equipe ou por
            um link de leitura.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Comunidade</h2>
        <p className="mt-2 leading-relaxed">
          Além do seu catálogo, o Asafe tem uma <strong>comunidade</strong>: publique seus
          repertórios para outros ministérios e aproveite o que já foi compartilhado. Uma{" "}
          <strong>curadoria</strong> acompanha o que circula, para manter a qualidade.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Gratuito</h2>
        <p className="mt-2 leading-relaxed">
          <strong>Gratuito, de verdade</strong> — sem plano pago e sem pegadinha. Use à vontade com
          a sua equipe.
        </p>
      </section>

      <p className="mt-10 text-center text-sm text-muted">
        <a href="/sobre">Sobre o nome &amp; open source →</a>
      </p>
    </main>
  );
}
