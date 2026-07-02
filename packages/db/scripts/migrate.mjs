// Aplica as migrations do drizzle usando o migrador do drizzle-orm (mesma tabela de
// controle do drizzle-kit). Serve para PRODUÇÃO (deploy) e para runs manuais.
//
// Conexão: SSL exigido fora de localhost (pooler do Supabase) e sem prepared statements
// (compatível com os poolers). A `DATABASE_URL` vem do ambiente — no CI/deploy pelo
// secret; localmente dá para usar `DOTENV_CONFIG_PATH=.env.prod` (dotenv/config respeita).
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente");

const isLocal = /localhost|127\.0\.0\.1/.test(url);
const sql = postgres(url, {
  max: 1,
  ssl: isLocal ? false : "require",
  prepare: false,
});

try {
  await migrate(drizzle(sql), {
    migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
  });
  console.log(`✓ migrations aplicadas (${isLocal ? "local" : "remoto"})`);
} finally {
  await sql.end();
}
