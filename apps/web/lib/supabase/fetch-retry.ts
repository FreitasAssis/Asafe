/**
 * `fetch` com retry para o cliente Supabase no servidor (SSR / route handlers).
 *
 * Só tenta de novo quando o `fetch` **lança** — ou seja, quando não houve resposta HTTP
 * (conexão recusada/resetada, TLS frio, timeout de conexão). Esse é justamente o "soluço"
 * da primeira ida à rede depois de um cold start do Worker: a request nem chegou a ser
 * processada pelo Supabase, então repetir é seguro (inclusive para as RPCs de leitura, que
 * trafegam como POST).
 *
 * O que NÃO repetimos de propósito:
 * - Respostas HTTP (mesmo 5xx): o servidor pode ter processado a request; repetir uma escrita
 *   poderia aplicá-la duas vezes. (As mutações do app passam pelo cliente do browser, não por
 *   aqui — mas a regra vale como salvaguarda.)
 * - Abortos (`AbortError`): quem chamou quis cancelar; respeitamos.
 */
const RETRY_DELAYS_MS = [120, 300];

export function fetchWithRetry(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await baseFetch(input, init);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        lastErr = err;
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) break; // esgotou as tentativas
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  };
}
