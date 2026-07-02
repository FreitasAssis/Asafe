import { defineConfig } from "drizzle-kit";

// ETAPA 2: aponta para o schema do §5 e usa a connection string do Supabase
// (via env, nunca comitada — ver .env.example e DESIGN.md §3).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
