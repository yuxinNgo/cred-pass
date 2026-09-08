import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

loadEnvConfig(process.cwd());
async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED before running migrations.");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
  try { await migrate(drizzle(pool), { migrationsFolder: "./drizzle" }); console.log("CredPass migrations applied."); }
  finally { await pool.end(); }
}
main().catch(() => { console.error("Migration failed. Check the direct database connection and migration permissions."); process.exitCode = 1; });
