import assert from "node:assert/strict";
import test from "node:test";
import { issuanceInput, verificationInput, revocationInput } from "../src/services/validation";
import { issueCredential } from "../src/modules/issuers/issue";

test("issuance HTTP boundary rejects non-string fields without coercion", () => {
  for (const body of [{}, { type: ["student"], expiresOn: "2030-01-01", holderName: "Demo" }, { type: "student", expiresOn: "2030-01-01", holderName: { toString: () => "Demo" } }]) assert.throws(() => issuanceInput(body));
  assert.deepEqual(issuanceInput({ type: "student", expiresOn: "2030-01-01", holderName: "Demo", ownerHash: "attacker" }), { type: "student", expiresOn: "2030-01-01", holderName: "Demo" });
});
test("server issuance boundary preserves domain validation for dates, lengths and unsupported types", () => {
  const input = { type: "student", expiresOn: "2030-01-01", holderName: "Demo" };
  for (const changed of [{ type: "admin" }, { expiresOn: "2027-02-30" }, { expiresOn: "2020-01-01" }, { holderName: " " }, { holderName: "a".repeat(81) }]) assert.throws(() => issueCredential(issuanceInput({ ...input, ...changed }), Date.parse("2026-09-08"), "demo"));
});
test("verification boundary permits missing-ID invalid scenario but rejects malformed ID/type", () => {
  assert.deepEqual(verificationInput({ credentialId: "", requiredType: "student", privateMetadata: { holderName: "ignored" } }), { credentialId: "", requiredType: "student" });
  for (const body of [{ credentialId: [], requiredType: "student" }, { credentialId: "a".repeat(97), requiredType: "student" }, { credentialId: "demo", requiredType: "admin" }]) assert.throws(() => verificationInput(body));
});
test("revocation requires a bounded credential ID and discards owner and status overrides", () => {
  for (const credentialId of [undefined, "", "  ", [], "a".repeat(97)]) assert.throws(() => revocationInput({ credentialId }));
  assert.deepEqual(revocationInput({ credentialId: "student-01", ownerHash: "other", status: "active" }), { credentialId: "student-01" });
});
