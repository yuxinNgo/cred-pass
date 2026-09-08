import assert from "node:assert/strict";
import test from "node:test";
import { credentialStatus, type Credential } from "../src/modules/credentials/model";

export const credential: Credential = {
  id: "student-01", type: "student", issuer: "Northstar University",
  issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z",
  status: "active", privateMetadata: { holderName: "Demo Holder", reference: "PRIVATE-001" },
};

test("credential expires at the exact expiration instant", () => {
  assert.equal(credentialStatus(credential, Date.parse("2026-12-31T23:59:59.999Z")), "active");
  assert.equal(credentialStatus(credential, Date.parse("2027-01-01T00:00:00.000Z")), "expired");
});
test("malformed expiration fails closed", () => {
  assert.equal(credentialStatus({ ...credential, expiresAt: "broken" }, Date.now()), "expired");
});
test("revoked credentials never regain active status", () => {
  assert.equal(credentialStatus({ ...credential, status: "revoked" }, 0), "revoked");
});
