import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente — veja packages/db/.env.example");

const queryClient = postgres(url);
export const db = drizzle(queryClient, { schema });
export const closeDb = () => queryClient.end();
