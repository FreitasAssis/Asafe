import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// App dinâmico (SSR via Supabase), sem ISR/next-image — config mínima, sem cache
// incremental (R2) nem binding de Images. Dá pra adicionar depois se precisar.
export default defineCloudflareConfig();
