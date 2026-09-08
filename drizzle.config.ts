import { defineConfig } from "drizzle-kit";

export default defineConfig({ dialect: "postgresql", schema: "./src/services/database/schema.ts", out: "./drizzle" });
