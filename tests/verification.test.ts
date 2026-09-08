import assert from "node:assert/strict";
import test from "node:test";
import { developmentAdapter } from "../src/adapters/midnight/development";
import type { Credential } from "../src/modules/credentials/model";

const sample: Credential = {
  id: "s1", type: "student", issuer: "Demo University", status: "active",
  issuedAt: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z",
  privateMetadata: { holderName: "Secret name", reference: "Secret reference" },
};
const now = Date.parse("2026-09-01T00:00:00Z");
const request = { credentialId: "s1", requiredType: "student" as const };

test("valid matching credential produces only the minimal result", async () => {
  assert.deepEqual(await developmentAdapter.verify([sample], request, now), { result: "VALID", mode: "development" });
});
test("missing credentials are invalid", async () => {
  assert.equal((await developmentAdapter.verify([], request, now)).result, "INVALID");
});
test("different credential type is invalid", async () => {
  assert.equal((await developmentAdapter.verify([sample], { ...request, requiredType: "employment" }, now)).result, "INVALID");
});
test("expired and revoked credentials are invalid", async () => {
  for (const invalid of [{ ...sample, expiresAt: new Date(now).toISOString() }, { ...sample, status: "revoked" as const }]) {
    assert.equal((await developmentAdapter.verify([invalid], request, now)).result, "INVALID");
  }
});
test("future-issued and malformed-issued credentials are invalid", async () => {
  for (const issuedAt of ["2030-01-01T00:00:00Z", "broken"]) {
    assert.equal((await developmentAdapter.verify([{ ...sample, issuedAt }], request, now)).result, "INVALID");
  }
});
test("non-finite verifier clock cannot approve a credential", async () => {
  assert.equal((await developmentAdapter.verify([sample], request, NaN)).result, "INVALID");
});
