import assert from "node:assert/strict";
import test from "node:test";
import { decryptMetadata, encryptMetadata, newWorkspaceToken, readMutation, workspaceOwner } from "../src/services/security";

test("256-bit workspace tokens produce stable nonreversible ownership IDs", () => {
  const token = newWorkspaceToken();
  assert.equal(Buffer.from(token, "base64url").length, 32);
  assert.match(workspaceOwner(token), /^[a-f0-9]{64}$/);
  assert.equal(workspaceOwner(token), workspaceOwner(token));
  assert.notEqual(workspaceOwner(token), workspaceOwner(newWorkspaceToken()));
  for (const invalid of ["", "../other-owner", "a".repeat(44), "x".repeat(43)]) assert.throws(() => workspaceOwner(invalid));
});
test("encrypted metadata roundtrips with fresh nonces and never contains private names", () => {
  const key = "ab".repeat(32);
  const metadata = { holderName: "PRIVATE-HOLDER", reference: "PRIVATE-REFERENCE" };
  const first = encryptMetadata(metadata, key, "owner:credential");
  assert.deepEqual(decryptMetadata(first, key, "owner:credential"), metadata);
  assert.notEqual(first, encryptMetadata(metadata, key, "owner:credential"));
  assert.equal(first.includes("PRIVATE"), false);
});
test("ciphertext rejects tampering, wrong key, cross-owner and cross-credential substitution", () => {
  const key = "cd".repeat(32);
  const encrypted = encryptMetadata({ holderName: "Demo" }, key, "owner-a:credential-a");
  for (const binding of ["owner-b:credential-a", "owner-a:credential-b"]) assert.throws(() => decryptMetadata(encrypted, key, binding));
  assert.throws(() => decryptMetadata(encrypted, "ef".repeat(32), "owner-a:credential-a"));
  const parts = encrypted.split(".");
  const bytes = Buffer.from(parts[3], "base64"); bytes[0] ^= 1; parts[3] = bytes.toString("base64");
  assert.throws(() => decryptMetadata(parts.join("."), key, "owner-a:credential-a"));
  assert.throws(() => encryptMetadata({}, "bad-key", "owner"));
});
test("mutations require exact origin, JSON object, and bounded streamed body", async () => {
  const request = (body: string, origin = "https://cred.test", contentType = "application/json") => new Request("https://cred.test/api/wallet", { method: "POST", headers: { origin, "content-type": contentType }, body });
  assert.deepEqual(await readMutation(request('{"action":"clear"}')), { action: "clear" });
  for (const invalid of [request("{}", "https://evil.test"), request("{}", ""), request("{}", "https://cred.test", "text/plain"), request("[]"), request("broken"), request(JSON.stringify({ name: "a".repeat(8192) }))]) await assert.rejects(readMutation(invalid));
});
