// Entry custom do worker: o `.open-next/worker.js` é REGENERADO a cada build e só
// exporta `fetch` — o handler `scheduled` do cron precisa viver aqui. Este arquivo
// reexporta o default do OpenNext + os exports nomeados e acrescenta o cron.
//
// FORA do tsconfig (exclude) de propósito: ele importa artefato de build
// (`.open-next/`, gitignorado) que não existe num clone fresco — o typecheck
// quebraria. Quem compila este arquivo é o esbuild do wrangler, no preview/deploy.
import openNextWorker from "./.open-next/worker.js";

// `export *` cobre os exports nomeados atuais E qualquer um que um upgrade do
// OpenNext adicione — uma lista enumerada quebraria em silêncio. `export *` NÃO
// reexporta o default, por isso o fetch continua explícito abaixo.
export * from "./.open-next/worker.js";

// Tipos mínimos locais: instalar @cloudflare/workers-types poluiria o app Next com
// os globals do runtime dos Workers (conflita com a lib dom).
type KeepaliveEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};
type ScheduledController = { scheduledTime: number; cron: string };
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

// Token que não existe: a RPC roda a query em `share_link`, não casa nenhuma linha e
// devolve `null` com 200. É uma consulta REAL no Postgres (o que mantém o projeto
// acordado) sem ler dado de ninguém — a RPC é `security definer stable` e só aceita
// token, então não há superfície pra vazar nada.
const KEEPALIVE_TOKEN = "keepalive-cron-token-inexistente";

const worker = {
  fetch: (request: Request, env: KeepaliveEnv, ctx: ExecutionContext) =>
    openNextWorker.fetch(request, env, ctx),

  // Cron diário (wrangler.jsonc → triggers.crons). O Supabase no plano free pausa o
  // projeto após ~7 dias sem atividade; este ping mantém ele ativo. Antes isso vivia
  // num workflow do GitHub Actions, que o GitHub DESATIVA após 60 dias sem commits —
  // ou seja, morria justamente nos períodos parados, que são quando o ping importa.
  // Cron Trigger da Cloudflare não expira por inatividade.
  async scheduled(
    _controller: ScheduledController,
    env: KeepaliveEnv,
    _ctx: ExecutionContext,
  ) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // As NEXT_PUBLIC_* são inlinadas pelo Next no BUILD — dentro do bundle do app elas
    // existem, mas aqui não: este arquivo é compilado pelo esbuild do wrangler, fora do
    // build do Next, e lê do env de RUNTIME do Worker. Quem as injeta é o `--var` no
    // deploy.yml. Se alguém remover de lá, o cron falha ALTO em vez de pingar o vazio.
    if (!url || !key) {
      throw new Error(
        "keepalive: NEXT_PUBLIC_SUPABASE_* ausentes no runtime do Worker (ver --var em .github/workflows/deploy.yml)",
      );
    }

    // `global_fetch_strictly_public` (compatibility_flags) garante que este fetch sai
    // pra internet pública, chegando no Supabase de verdade.
    const response = await fetch(
      new URL("/rest/v1/rpc/get_shared_repertoire_full", url),
      {
        method: "POST",
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ p_token: KEEPALIVE_TOKEN }),
      },
    );
    const body = await response.text();

    // Erro visível no painel do Worker (observability ligada no wrangler.jsonc). O ping
    // precisa distinguir "banco respondeu" de "banco fora" — por isso a RPC direta, e
    // não um fetch à própria página /r/[token], que devolve 200 mesmo com o Supabase
    // fora (ela trata o erro renderizando "link inválido").
    if (!response.ok) {
      throw new Error(`keepalive falhou: ${response.status} ${body}`);
    }
    console.log(`keepalive ok: ${response.status}`);
  },
};

export default worker;
