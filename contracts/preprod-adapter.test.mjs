import assert from "node:assert/strict";
import test from "node:test";
import { createConstructorContext } from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  artifactDirectory,
  contractName,
  privateStateId,
  publicSnapshot,
  witnesses,
} from "./preprod-adapter.mjs";

test("CredPass adapter builds constructor state and exposes public counters", () => {
  const privateState = {
    issuerSecret: new Uint8Array(32).fill(1),
    holderSecret: new Uint8Array(32).fill(2),
  };
  const initial = new Contract(witnesses).initialState(
    createConstructorContext(privateState, "0".repeat(64)),
  );
  assert.equal(contractName, "CredPass");
  assert.equal(privateStateId, "credPass");
  assert.match(artifactDirectory.replaceAll("\\", "/"), /contracts\/managed\/$/);
  assert.deepEqual(publicSnapshot(initial.currentContractState.data), {
    credentialCount: 0,
    revokedCount: 0,
    presentationCount: 0,
  });
});

test("CredPass witnesses fail closed when a private value is absent", () => {
  assert.throws(() => witnesses.holderSecret({ privateState: {} }), /holderSecret/);
});
