import assert from "node:assert/strict";
import test from "node:test";
import { constructorContext, QueryContext, dummyContractAddress, CostModel, persistentHash, CompactTypeVector, CompactTypeBytes } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "./managed/contract/index.cjs";

const id = new Uint8Array(32).fill(1);
const issuer = new Uint8Array(32).fill(2);
const stranger = new Uint8Array(32).fill(3);
const holder = new Uint8Array(32).fill(4);
// Holder-side computation: the issuer receives only this public commitment.
const holderDomain = new Uint8Array(32);
holderDomain.set(new TextEncoder().encode("credpass:holder:v1"));
const holderCommitment = persistentHash(new CompactTypeVector(3, new CompactTypeBytes(32)), [holderDomain, id, holder]);
function registry() {
  const contract = new Contract({ issuerSecret: ({ privateState }) => [privateState, privateState] });
  const initial = contract.initialState(constructorContext(issuer, "00".repeat(32)));
  let state = initial.currentContractState.data;
  return {
    call(name, args, secret = issuer, now = 99n, error = 0) {
      const transactionContext = new QueryContext(state, dummyContractAddress());
      transactionContext.block = { secondsSinceEpoch: now, secondsSinceEpochErr: error, blockHash: "00".repeat(32) };
      const result = contract.circuits[name]({
        originalState: initial.currentContractState, currentPrivateState: secret,
        currentZswapLocalState: initial.currentZswapLocalState, transactionContext,
      }, ...args);
      state = result.context.transactionContext.state;
      return result;
    },
    ledger: () => ledger(state),
  };
}

test("compiled registry stores an immutable credential and rejects unsupported types", () => {
  const r = registry();
  r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment]);
  assert.deepEqual(r.ledger().credentials.lookup(id).holderCommitment, holderCommitment);
  assert.deepEqual(r.ledger().credentials.lookup(id), { credentialType: 0n, expiresAt: 100n, holderCommitment });
  assert.throws(() => r.call("registerDemoCredential", [id, 1n, 200n, holderCommitment]), /already registered/);
  assert.throws(() => r.call("registerDemoCredential", [stranger, 3n, 100n, holderCommitment]), /Unsupported/);
  assert.equal(r.ledger().credentials.size(), 1n);
});

test("registration requires the constructor issuer secret, not public identity", () => {
  const r = registry();
  assert.throws(() => r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment], stranger), /Unauthorized issuer/);
  assert.throws(() => r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment], r.ledger().issuerCommitment), /Unauthorized issuer/);
  assert.equal(r.ledger().credentials.size(), 0n);
  r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment]);
  assert.equal(r.ledger().credentials.size(), 1n);
});

test("issuer revocation is permanent and rejects strangers and unknown IDs", () => {
  const r = registry();
  r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment]);
  assert.throws(() => r.call("revokeDemoCredential", [id], stranger), /Unauthorized issuer/);
  assert.equal(r.call("checkDemoValidity", [id, 0n]).result, true);
  assert.throws(() => r.call("revokeDemoCredential", [stranger]), /not registered/);
  r.call("revokeDemoCredential", [id]);
  r.call("revokeDemoCredential", [id]);
  assert.equal(r.call("checkDemoValidity", [id, 0n]).result, false);
  assert.throws(() => r.call("registerDemoCredential", [id, 0n, 200n, holderCommitment]), /already registered/);
  assert.equal(r.ledger().revoked.size(), 1n);
});

test("validity cannot use a caller timestamp to bypass ledger expiration", () => {
  const r = registry();
  r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment]);
  assert.throws(() => r.call("checkDemoValidity", [id, 0n, 0n], issuer, 100n), /expected 3 arguments/);
  assert.equal(r.call("checkDemoValidity", [id, 0n], issuer, 99n).result, true);
  assert.equal(r.call("checkDemoValidity", [id, 0n], issuer, 100n).result, false);
  assert.equal(r.call("checkDemoValidity", [id, 0n], issuer, 101n).result, false);
  assert.equal(r.call("checkDemoValidity", [id, 1n]).result, false);
  assert.equal(r.call("checkDemoValidity", [stranger, 0n]).result, false);
});

test("kernel compares nominal ledger seconds even with a nonzero error window", () => {
  const r = registry();
  r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment]);
  assert.equal(r.call("checkDemoValidity", [id, 0n], issuer, 98n, 1).result, true);
  assert.equal(r.call("checkDemoValidity", [id, 0n], issuer, 99n, 1).result, true);
  assert.equal(r.call("checkDemoValidity", [id, 0n], issuer, 100n, 1).result, false);
});

test("a valid ledger transcript cannot be replayed at or after expiry", () => {
  const r = registry();
  r.call("registerDemoCredential", [id, 0n, 100n, holderCommitment]);
  const valid = r.call("checkDemoValidity", [id, 0n], issuer, 99n, 1);
  const transcript = { gas: 1000000000n, effects: valid.context.transactionContext.effects,
    program: valid.proofData.publicTranscript };
  for (const now of [99n, 100n, 101n]) {
    const context = new QueryContext(valid.context.transactionContext.state, dummyContractAddress());
    context.block = { secondsSinceEpoch: now, secondsSinceEpochErr: 1, blockHash: "00".repeat(32) };
    const replay = () => context.runTranscript(transcript, CostModel.dummyCostModel());
    if (now === 99n) assert.doesNotThrow(replay);
    else assert.throws(replay);
  }
});
