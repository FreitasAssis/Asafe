import { Brand } from "@/components/brand";
import { BackButton } from "@/components/back-button";

export const metadata = { title: "Sobre — Asafe" };

/** Página pública: a história do nome, o app e o open source. Fora do shell logado. */
export default function Sobre() {
  return (
    <main className="mx-auto my-10 max-w-2xl px-4">
      <div className="mb-4 flex items-center justify-between">
        <a href="/" aria-label="Início" className="inline-block">
          <Brand />
        </a>
        <BackButton />
      </div>

      <h1 className="mt-2 font-serif text-3xl font-semibold">Sobre o Asafe</h1>

      <section className="mt-6">
        <h2 className="font-serif text-xl font-semibold">O nome</h2>
        <p className="mt-2 leading-relaxed">
          Asaf foi um levita do tempo do rei Davi, posto à frente do canto diante da Arca (1
          Crônicas 16). A ele se atribuem doze salmos do saltério — entre eles o Salmo 50 e os
          Salmos 73 a 83 — e a Escritura ainda o chama de <em>vidente</em>. Seus filhos, os “filhos
          de Asaf”, seguiram como cantores do Templo por gerações.
        </p>
        <p className="mt-3 leading-relaxed">
          Chamar o app de <strong>Asafe</strong> é um aceno a esse serviço discreto e essencial:
          quem prepara e conduz a música da assembleia. Pouca gente conhece o nome — e tudo bem; faz
          parte.
        </p>
      </section>

      <section className="mt-6">
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

      <section className="mt-6">
        <h2 className="font-serif text-xl font-semibold">Open source</h2>
        <p className="mt-2 leading-relaxed">
          O Asafe é software livre, sob a licença <strong>AGPL-3.0</strong>. O código é aberto e
          contribuições são bem-vindas — no GitHub:{" "}
          <a href="https://github.com/FreitasAssis/Asafe" target="_blank" rel="noreferrer">
            github.com/FreitasAssis/Asafe
          </a>
          .
        </p>
      </section>

      <p className="mt-8 text-sm text-muted">
        Feito por{" "}
        <a href="https://luizfreitas.com.br/" target="_blank" rel="noreferrer">
          Luiz Freitas
        </a>
        .
      </p>
    </main>
  );
}
