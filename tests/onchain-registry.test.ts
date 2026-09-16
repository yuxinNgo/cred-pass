import test from "node:test";
import assert from "node:assert/strict";
import { createConstructorContext, encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "../contracts/managed/contract/index.js";
import { witnesses } from "../src/lib/midnight/private-state";
import { hex32, publicRegistry, runRegistryCircuit, holderCommitment } from "../src/lib/midnight/registry-contract";

test("projects only aggregate registry state and rejects malformed contract bytes", () => {
  assert.throws(() => hex32("bad"), /32-byte/);
  const initial = new Contract(witnesses).initialState(
    createConstructorContext({ issuerSecret: new Uint8Array(32).fill(1) }, "0".repeat(64)),
  );
  assert.deepEqual(publicRegistry(ledger(initial.currentContractState.data)), {
    credentialCount: "0", revokedCount: "0", presentationCount: "0",
  });
});

test("derives the same holder commitment as the Compact circuit", () => {
  const address = "01".repeat(32), id = "02".repeat(32), secret = "03".repeat(32);
  assert.deepEqual(holderCommitment(address, id, secret), pureCircuits.holderKey(
    encodeContractAddress(address), hex32(id), hex32(secret),
  ));
});

test("routes issuer and holder operations to their matching Compact circuit", async () => {
  const calls: string[] = [];
  const callTx = {
    registerCredential: async (id: Uint8Array, type: bigint, expires: bigint, holder: Uint8Array) => { calls.push(`register:${id.length}:${type}:${expires}:${holder.length}`); return { public: { txId: "register-id" } }; },
    revokeCredential: async (id: Uint8Array) => { calls.push(`revoke:${id.length}`); return { public: { txId: "revoke-id" } }; },
    presentCredential: async (id: Uint8Array, type: bigint, challenge: Uint8Array) => { calls.push(`present:${id.length}:${type}:${challenge.length}`); return { public: { txId: "present-id" } }; },
  };
  assert.equal(await runRegistryCircuit(callTx, "register", { id: new Uint8Array(32).fill(1), type: 1n, expiresAt: 2n, holderCommitment: new Uint8Array(32).fill(2) }), "register-id");
  assert.equal(await runRegistryCircuit(callTx, "revoke", { id: new Uint8Array(32) }), "revoke-id");
  assert.equal(await runRegistryCircuit(callTx, "present", { id: new Uint8Array(32).fill(1), type: 1n, challenge: new Uint8Array(32).fill(3) }), "present-id");
  assert.deepEqual(calls, ["register:32:1:2:32", "revoke:32", "present:32:1:32"]);
});
