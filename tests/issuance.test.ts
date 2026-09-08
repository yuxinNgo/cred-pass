import assert from "node:assert/strict";
import test from "node:test";
import { issueCredential } from "../src/modules/issuers/issue";
const now = Date.parse("2026-09-08T12:00:00Z");
const input = { type: "student", expiresOn: "2027-09-08", holderName: "  Demo Holder  " };

test("issuance validates and normalizes holder fields with UTC midnight expiry", () => {
  const credential = issueCredential(input, now, "demo-1");
  assert.equal(credential.privateMetadata.holderName, "Demo Holder");
  assert.equal(credential.expiresAt, "2027-09-08T00:00:00.000Z");
  assert.equal(credential.issuedAt, "2026-09-08T12:00:00.000Z");
  assert.equal(credential.type, "student");
});
test("rejects unsupported type and missing or oversized holder name", () => {
  for (const invalid of [{ ...input, type: "admin" }, { ...input, holderName: " " }, { ...input, holderName: "a".repeat(81) }]) {
    assert.throws(() => issueCredential(invalid, now, "demo-1"));
  }
});
test("rejects impossible, elapsed, and non-date expiration input", () => {
  for (const expiresOn of ["2027-02-30", "2026-09-08", "2020-01-01", "garbage", "2027-01-01T12:00:00Z"]) {
    assert.throws(() => issueCredential({ ...input, expiresOn }, now, "demo-1"));
  }
});
