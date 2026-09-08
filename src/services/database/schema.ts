import { check, pgEnum, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const credentialType = pgEnum("credpass_type", ["student", "employment", "professional"]);
export const credentialStatus = pgEnum("credpass_status", ["active", "revoked"]);
export const workspaces = pgTable("credpass_workspaces", {
  ownerHash: varchar("owner_hash", { length: 64 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("owner_hash_format", sql`${table.ownerHash} ~ '^[a-f0-9]{64}$'`)]);

export const credentials = pgTable("credpass_credentials", {
  ownerHash: varchar("owner_hash", { length: 64 }).notNull().references(() => workspaces.ownerHash, { onDelete: "cascade" }),
  id: varchar("id", { length: 96 }).notNull(),
  type: credentialType("type").notNull(),
  issuer: varchar("issuer", { length: 160 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  status: credentialStatus("status").notNull(),
  encryptedMetadata: text("encrypted_metadata").notNull(),
}, (table) => [
  primaryKey({ columns: [table.ownerHash, table.id] }),
  check("expiry_after_issuance", sql`${table.expiresAt} > ${table.issuedAt}`),
]);
