import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { workspaceOwner } from "../src/services/security";
import type { Credential } from "../src/modules/credentials/model";

loadEnvConfig(process.cwd());
const base = process.env.INTEGRATION_BASE_URL ?? "http://localhost:3114";
const origin = new URL(base).origin;
const owners: string[] = [];

async function call(path: string, cookie = "", body?: object, customOrigin = origin) {
  return fetch(`${base}${path}`, { method: body ? "POST" : "GET", headers: { cookie, ...(body ? { "Content-Type": "application/json", Origin: customOrigin } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
async function openWorkspace() {
  const response = await call("/api/wallet");
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  assert.ok(setCookie.includes("HttpOnly") && /SameSite=lax/i.test(setCookie));
  const cookie = setCookie.split(";")[0];
  owners.push(workspaceOwner(cookie.slice(cookie.indexOf("=") + 1)));
  const data = await response.json() as { credentials: Credential[] };
  assert.equal(data.credentials.length, 3);
  return cookie;
}
async function wallet(cookie: string) {
  const response = await call("/api/wallet", cookie);
  assert.equal(response.status, 200);
  return (await response.json() as { credentials: Credential[] }).credentials;
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Integration requires a disposable migrated database and a running app.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
  try {
    assert.equal((await call("/api/health")).status, 200);
    const a = await openWorkspace();
    const b = await openWorkspace();
    assert.notEqual(a, b);
    const input = { type: "student", expiresOn: new Date(Date.now() + 366 * 86400000).toISOString().slice(0, 10), holderName: "Integration private holder" };
    const created = await call("/api/credentials", a, input);
    assert.equal(created.status, 200);
    const issued = (await created.json() as { credential: Credential }).credential;
    assert.equal((await wallet(a)).find((item) => item.id === issued.id)?.privateMetadata.holderName, input.holderName);
    assert.equal((await wallet(b)).some((item) => item.id === issued.id), false);
    const encrypted = await pool.query<{ encrypted_metadata: string }>("SELECT encrypted_metadata FROM credpass_credentials WHERE owner_hash = $1 AND id = $2", [owners[0], issued.id]);
    assert.match(encrypted.rows[0].encrypted_metadata, /^v1\./);
    assert.equal(encrypted.rows[0].encrypted_metadata.includes(input.holderName), false);
    for (const [cookie, requiredType, credentialId, expected] of [[a, "student", issued.id, "VALID"], [b, "student", issued.id, "INVALID"], [a, "employment", issued.id, "INVALID"], [a, "professional", "design-professional", "INVALID"]]) {
      const response = await call("/api/verify", cookie, { credentialId, requiredType });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { result: expected, mode: "development" });
    }
    assert.equal((await call("/api/wallet", a, { action: "clear" }, "https://other-origin.invalid")).status, 403);
    assert.equal((await call("/api/credentials", "", input)).status, 401);
    assert.equal((await call("/api/credentials", a, { ...input, holderName: 12 })).status, 400);
    assert.equal((await call("/api/wallet", b, { action: "clear", ownerHash: owners[0] })).status, 200);
    assert.equal((await wallet(b)).length, 0);
    assert.equal((await wallet(a)).length, 4);
    assert.equal((await call("/api/wallet", b, { action: "restore" })).status, 200);
    assert.equal((await wallet(b)).length, 3);
    assert.equal((await wallet(a)).length, 4);
    // Fill only this disposable workspace near the limit to test the real transaction cap.
    await pool.query("INSERT INTO credpass_credentials (owner_hash,id,type,issuer,issued_at,expires_at,status,encrypted_metadata) SELECT owner_hash, 'cap-' || n, type, issuer, issued_at, expires_at, status, encrypted_metadata FROM credpass_credentials CROSS JOIN generate_series(1,246) n WHERE owner_hash=$1 AND id=$2", [owners[0], issued.id]);
    assert.equal((await call("/api/credentials", a, input)).status, 409);
    // Copied ciphertext is deliberately bound to another ID: a holder read must fail closed.
    assert.equal((await call("/api/wallet", a)).status, 503);
    assert.equal((await call("/api/wallet", a, { action: "clear" })).status, 200);
    assert.equal((await wallet(a)).length, 0);
    assert.equal((await wallet(b)).length, 3);
    console.log("PASS: persistence, scoped ownership, encrypted storage, validity, mutation guards, cap, tamper rejection, clear/restore.");
  } finally {
    for (const owner of owners) await pool.query("DELETE FROM credpass_workspaces WHERE owner_hash = $1", [owner]);
    await pool.end();
  }
}
main().catch(() => { console.error("Integration check failed. Verify the disposable database and running app; no secrets are logged."); process.exitCode = 1; });
