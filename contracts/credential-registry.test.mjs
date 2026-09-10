import assert from "node:assert/strict";
import test from "node:test";
import { constructorContext, QueryContext, dummyContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "./managed/contract/index.cjs";

const id = new Uint8Array(32).fill(1);
const issuer = new Uint8Array(32).fill(2);
const stranger = new Uint8Array(32).fill(3);
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
  r.call("registerDemoCredential", [id, 0n, 100n]);
  assert.deepEqual(r.ledger().credentials.lookup(id), { credentialType: 0n, expiresAt: 100n });
  assert.throws(() => r.call("registerDemoCredential", [id, 1n, 200n]), /already registered/);
  assert.throws(() => r.call("registerDemoCredential", [stranger, 3n, 100n]), /Unsupported/);
  assert.equal(r.ledger().credentials.size(), 1n);
});
