/**
 * @asafe/db — cliente e schema do Postgres (Supabase) via Drizzle.
 *
 * ETAPA 2: cliente `postgres` + `drizzle()`, export do schema e helpers de RLS.
 * Onde o RLS já resolve, o app acessa via `supabase-js` direto (ver DESIGN.md §3).
 */
export * from "./client";
export * from "./schema/index";
