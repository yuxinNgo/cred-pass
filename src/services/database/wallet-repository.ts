import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { database } from "./client";
import { credentials, workspaces } from "./schema";
import { demoCredentials } from "@/store/demo-data";
import type { Credential } from "@/modules/credentials/model";
import { decryptMetadata, encryptMetadata, RequestError } from "../security";

function ownerScope(owner: string) {
  if (!/^[a-f0-9]{64}$/.test(owner)) throw new RequestError("Invalid workspace.", 401);
  return eq(credentials.ownerHash, owner);
}
function encryptionKey() {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) throw new Error("Credential encryption is not configured.");
  return key;
}
function storedCredential(owner: string, credential: Credential) {
  const { privateMetadata, ...publicFields } = credential;
  return { ...publicFields, ownerHash: owner, encryptedMetadata: encryptMetadata(privateMetadata, encryptionKey(), `${owner}:${credential.id}`) };
}
function holderCredential(row: typeof credentials.$inferSelect): Credential {
  const metadata = decryptMetadata(row.encryptedMetadata, encryptionKey(), `${row.ownerHash}:${row.id}`);
  if (!metadata || typeof metadata !== "object" || !("holderName" in metadata) || !("reference" in metadata)
    || typeof metadata.holderName !== "string" || typeof metadata.reference !== "string") throw new Error("Invalid credential metadata.");
  return { id: row.id, type: row.type, issuer: row.issuer, issuedAt: new Date(row.issuedAt).toISOString(), expiresAt: new Date(row.expiresAt).toISOString(), status: row.status, privateMetadata: { holderName: metadata.holderName, reference: metadata.reference } };
}

export async function readWallet(owner: string) {
  const scope = ownerScope(owner);
  encryptionKey();
  return database().transaction(async (tx) => {
    const created = await tx.insert(workspaces).values({ ownerHash: owner }).onConflictDoNothing().returning();
    if (created.length) await tx.insert(credentials).values(demoCredentials.map((credential) => storedCredential(owner, credential)));
    return (await tx.select().from(credentials).where(scope).orderBy(desc(credentials.issuedAt)).limit(250)).map(holderCredential);
  });
}

type WalletMutation = { action: "issue"; credential: Credential } | { action: "clear" | "restore" };
export async function mutateWallet(owner: string, mutation: WalletMutation) {
  const scope = ownerScope(owner);
  encryptionKey();
  return database().transaction(async (tx) => {
    // Serialize per workspace so simultaneous issuance cannot exceed the cap.
    const existing = await tx.select().from(workspaces).where(eq(workspaces.ownerHash, owner)).for("update");
    if (!existing.length) throw new RequestError("Open your wallet before changing it.", 401);
    if (mutation.action === "issue") {
      const [{ total }] = await tx.select({ total: count() }).from(credentials).where(scope);
      if (total >= 250) throw new RequestError("This demo wallet is limited to 250 credentials.", 409);
      await tx.insert(credentials).values(storedCredential(owner, mutation.credential));
    } else {
      await tx.delete(credentials).where(scope);
      if (mutation.action === "restore") await tx.insert(credentials).values(demoCredentials.map((credential) => storedCredential(owner, credential)));
    }
    return (await tx.select().from(credentials).where(scope).orderBy(desc(credentials.issuedAt)).limit(250)).map(holderCredential);
  });
}

export async function readProofCredential(owner: string, id: string): Promise<Credential[]> {
  const scope = ownerScope(owner);
  // Verifier checks never fetch or decrypt the private metadata column.
  const rows = await database().select({ id: credentials.id, type: credentials.type, issuedAt: credentials.issuedAt, expiresAt: credentials.expiresAt, status: credentials.status }).from(credentials).where(and(scope, eq(credentials.id, id))).limit(1);
  return rows.map((row) => ({ ...row, issuer: "", privateMetadata: { holderName: "", reference: "" } }));
}
