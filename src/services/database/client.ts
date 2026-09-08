import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

let pool: Pool | undefined;
export function database() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
    pool.on("error", () => console.error("CredPass database connection interrupted."));
    if (process.env.VERCEL) attachDatabasePool(pool);
  }
  return drizzle(pool, { schema });
}
