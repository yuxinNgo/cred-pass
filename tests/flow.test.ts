import assert from "node:assert/strict";
import test from "node:test";
import { issueCredential } from "../src/modules/issuers/issue";
import { developmentAdapter } from "../src/adapters/midnight/development";
import { formatDate } from "../src/shared/date";

test("issued credential verifies, fails on wrong type, and expires at midnight UTC", async () => {
  const issuedAt = Date.parse("2026-09-08T12:00:00Z");
  const credential = issueCredential({ type: "professional", holderName: "Demo engineer", expiresOn: "2026-09-10" }, issuedAt, "demo-cert");
  const request = { credentialId: "demo-cert", requiredType: "professional" as const };
  assert.deepEqual(await developmentAdapter.verify([credential], request, issuedAt), { result: "VALID", mode: "development" });
  assert.equal((await developmentAdapter.verify([credential], { ...request, requiredType: "student" }, issuedAt)).result, "INVALID");
  assert.equal((await developmentAdapter.verify([credential], request, Date.parse("2026-09-09T23:59:59.999Z"))).result, "VALID");
  assert.equal((await developmentAdapter.verify([credential], request, Date.parse("2026-09-10T00:00:00Z"))).result, "INVALID");
  assert.equal((await developmentAdapter.verify([], request, issuedAt)).result, "INVALID");
});

test("wallet dates display in UTC, not the browser timezone", () => {
  assert.equal(formatDate("2026-09-08T23:59:59Z"), "Sep 8, 2026");
  assert.equal(formatDate("not a date"), "Unknown date");
});
