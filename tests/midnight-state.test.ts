import test from "node:test";
import assert from "node:assert/strict";
import { memoryPrivateState, witnesses } from "../src/lib/midnight/private-state";

test("credential witnesses fail closed and state is scoped to a contract", async () => {
  assert.throws(() => witnesses.issuerSecret({ privateState: {} } as never), /issuerSecret/);
  assert.throws(() => witnesses.holderSecret({ privateState: {} } as never), /holderSecret/);
  const store = memoryPrivateState();
  store.setContractAddress("a".repeat(64));
  await store.set("registry", { issuerSecret: new Uint8Array(32) });
  assert.equal((await store.get("registry"))?.issuerSecret?.length, 32);
  store.setContractAddress("b".repeat(64));
  assert.equal(await store.get("registry"), null);
  await store.clear();
  store.setContractAddress("a".repeat(64));
  assert.equal(await store.get("registry"), null);
});
