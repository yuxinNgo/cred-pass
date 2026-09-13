import assert from "node:assert/strict";
import test from "node:test";
import {
  CostModel,
  QueryContext,
  createConstructorContext,
  decodeContractAddress,
  dummyContractAddress,
  encodeContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "./managed/contract/index.js";

const id = new Uint8Array(32).fill(1);
const issuer = new Uint8Array(32).fill(2);
const stranger = new Uint8Array(32).fill(3);
const holder = new Uint8Array(32).fill(4);
const challenge = new Uint8Array(32).fill(5);
const secondChallenge = new Uint8Array(32).fill(6);
const replayGas = {
  readTime: 10n ** 18n,
  computeTime: 10n ** 18n,
  bytesWritten: 10n ** 18n,
  bytesDeleted: 10n ** 18n,
};

function registry(holderWitness = holder, address = dummyContractAddress()) {
  const contract = new Contract({
    issuerSecret: ({ privateState }) => [privateState, privateState],
    holderSecret: ({ privateState }) => [privateState, holderWitness],
  });
  const initial = contract.initialState(createConstructorContext(issuer, "00".repeat(32)));
  let state = initial.currentContractState.data;
  return {
    address,
    state: () => state,
    call(name, args, secret = issuer, now = 99n, error = 0) {
      const currentQueryContext = new QueryContext(state, address);
      currentQueryContext.block = {
        ...currentQueryContext.block,
        secondsSinceEpoch: now,
        secondsSinceEpochErr: error,
        blockHash: "00".repeat(32),
      };
      const result = contract.impureCircuits[name]({
        currentPrivateState: secret,
        currentZswapLocalState: initial.currentZswapLocalState,
        costModel: CostModel.initialCostModel(),
        currentQueryContext,
      }, ...args);
      state = result.context.currentQueryContext.state;
      return result;
    },
    ledger: () => ledger(state),
  };
}

function holderCommitmentFor(address, credentialId = id, secret = holder) {
  return pureCircuits.holderKey(encodeContractAddress(address), credentialId, secret);
}

function register(h, credentialId = id, expiresAt = 200n, secret = holder) {
  const commitment = holderCommitmentFor(h.address, credentialId, secret);
  h.call("registerCredential", [credentialId, 0n, expiresAt, commitment]);
  return commitment;
}

test("holder presents once per nonzero verifier challenge", () => {
  const h = registry();
  register(h);
  assert.equal(h.call("presentCredential", [id, 0n, challenge]).result, true);
  assert.equal(h.ledger().presentationNullifiers.size(), 1n);
  assert.throws(() => h.call("presentCredential", [id, 0n, challenge]), /already used/i);
  assert.equal(h.call("presentCredential", [id, 0n, secondChallenge]).result, true);
  assert.equal(h.ledger().presentationNullifiers.size(), 2n);
});

test("credential presentation rejects invalid proof boundaries atomically", () => {
  const h = registry();
  register(h, id, 100n);
  for (const [args, now, pattern] of [
    [[id, 0n, new Uint8Array(32)], 99n, /challenge/i],
    [[stranger, 0n, challenge], 99n, /not registered/i],
    [[id, 1n, challenge], 99n, /type/i],
    [[id, 0n, challenge], 100n, /expired/i],
  ]) {
    assert.throws(() => h.call("presentCredential", args, issuer, now), pattern);
    assert.equal(h.ledger().presentationNullifiers.size(), 0n);
  }
  const wrong = registry(stranger);
  register(wrong);
  assert.throws(() => wrong.call("presentCredential", [id, 0n, challenge]), /holder/i);
  assert.equal(wrong.ledger().presentationNullifiers.size(), 0n);
  h.call("revokeCredential", [id]);
  assert.throws(() => h.call("presentCredential", [id, 0n, challenge]), /revoked/i);
  assert.equal(h.ledger().presentationNullifiers.size(), 0n);
});

test("registry stores an immutable credential and rejects unsupported types", () => {
  const h = registry();
  const commitment = register(h, id, 100n);
  assert.deepEqual(h.ledger().credentials.lookup(id), {
    credentialType: 0n,
    expiresAt: 100n,
    holderCommitment: commitment,
  });
  assert.throws(() => h.call("registerCredential", [id, 1n, 200n, commitment]), /already registered/i);
  assert.throws(() => h.call("registerCredential", [stranger, 3n, 100n, commitment]), /unsupported/i);
  assert.equal(h.ledger().credentials.size(), 1n);
});

test("registration requires the constructor issuer secret, not public identity", () => {
  const h = registry();
  const commitment = holderCommitmentFor(h.address);
  for (const secret of [stranger, holder, h.ledger().issuerCommitment]) {
    assert.throws(() => h.call("registerCredential", [id, 0n, 100n, commitment], secret), /issuer/i);
  }
  assert.equal(h.ledger().credentials.size(), 0n);
  h.call("registerCredential", [id, 0n, 100n, commitment]);
  assert.equal(h.ledger().credentials.size(), 1n);
});

test("issuer revocation is permanent and rejects strangers and unknown IDs", () => {
  const h = registry();
  register(h);
  assert.throws(() => h.call("revokeCredential", [id], stranger), /issuer/i);
  assert.throws(() => h.call("revokeCredential", [id], holder), /issuer/i);
  assert.throws(() => h.call("revokeCredential", [stranger]), /not registered/i);
  h.call("revokeCredential", [id]);
  h.call("revokeCredential", [id]);
  assert.throws(() => h.call("presentCredential", [id, 0n, challenge]), /revoked/i);
  assert.throws(() => h.call("registerCredential", [id, 0n, 200n, holderCommitmentFor(h.address)]), /already registered/i);
  assert.equal(h.ledger().revoked.size(), 1n);
});

test("expiration is ledger-bound and exclusive", () => {
  for (const [now, valid] of [[99n, true], [100n, false], [101n, false]]) {
    const h = registry();
    register(h, id, 100n);
    const present = () => h.call("presentCredential", [id, 0n, challenge], issuer, now);
    if (valid) assert.equal(present().result, true);
    else assert.throws(present, /expired/i);
  }
});

test("kernel compares nominal ledger seconds with a nonzero error window", () => {
  for (const [now, valid] of [[98n, true], [99n, true], [100n, false]]) {
    const h = registry();
    register(h, id, 100n);
    const present = () => h.call("presentCredential", [id, 0n, challenge], issuer, now, 1);
    if (valid) assert.equal(present().result, true);
    else assert.throws(present, /expired/i);
  }
});

test("a valid presentation transcript cannot replay or cross expiry", () => {
  const h = registry();
  register(h, id, 100n);
  const before = h.state();
  const valid = h.call("presentCredential", [id, 0n, challenge], issuer, 99n, 1);
  const transcript = {
    gas: replayGas,
    effects: valid.context.currentQueryContext.effects,
    program: valid.proofData.publicTranscript,
  };
  for (const now of [99n, 100n, 101n]) {
    const context = new QueryContext(before, h.address);
    context.block = {
      ...context.block,
      secondsSinceEpoch: now,
      secondsSinceEpochErr: 1,
      blockHash: "00".repeat(32),
    };
    const replay = () => context.runTranscript(transcript, CostModel.initialCostModel());
    if (now === 99n) {
      const applied = replay();
      assert.throws(() => applied.runTranscript(transcript, CostModel.initialCostModel()));
    } else {
      assert.throws(replay);
    }
  }
});

test("only the committed holder secret can present", () => {
  for (const secret of [stranger, issuer, holderCommitmentFor(dummyContractAddress()), new Uint8Array(32)]) {
    const h = registry(secret);
    register(h);
    assert.throws(() => h.call("presentCredential", [id, 0n, challenge]), /holder/i);
  }
  const h = registry();
  register(h);
  assert.equal(h.call("presentCredential", [id, 0n, challenge], stranger).result, true);
});

test("issuance rejects an unset holder commitment without consuming the ID", () => {
  const h = registry();
  assert.throws(() => h.call("registerCredential", [id, 0n, 100n, new Uint8Array(32)]), /holder commitment/i);
  assert.equal(h.ledger().credentials.size(), 0n);
  register(h, id, 100n);
  assert.equal(h.call("presentCredential", [id, 0n, challenge]).result, true);
});

test("a holder commitment copied onto another credential does not transfer ownership", () => {
  const h = registry();
  const commitment = register(h, id, 100n);
  h.call("registerCredential", [stranger, 0n, 100n, commitment]);
  assert.equal(h.call("presentCredential", [id, 0n, challenge]).result, true);
  assert.throws(() => h.call("presentCredential", [stranger, 0n, secondChallenge]), /holder/i);
});

test("private holder material stays out of public ledger and transcript", () => {
  const h = registry();
  register(h);
  const result = h.call("presentCredential", [id, 0n, challenge]);
  const serialize = (value) => JSON.stringify(value, (_, item) => {
    if (typeof item === "bigint") return item.toString();
    return item instanceof Uint8Array ? Buffer.from(item).toString("hex") : item;
  });
  const publicData = serialize([
    result.context.currentQueryContext.state.state.encode(),
    result.proofData.publicTranscript,
  ]);
  const privateData = serialize(result.proofData.privateTranscriptOutputs);
  const holderHex = Buffer.from(holder).toString("hex");
  assert.ok(privateData.includes(holderHex));
  assert.ok(!publicData.includes(holderHex));
});

test("holder commitments are deployment-bound", () => {
  const address = decodeContractAddress(new Uint8Array(32).fill(9));
  const other = registry(holder, address);
  other.call("registerCredential", [id, 0n, 100n, holderCommitmentFor(dummyContractAddress())]);
  assert.throws(() => other.call("presentCredential", [id, 0n, challenge]), /holder/i);
  const local = registry(holder, address);
  register(local, id, 100n);
  assert.equal(local.call("presentCredential", [id, 0n, challenge]).result, true);
});

test("the same verifier challenge is independent across credential IDs", () => {
  const h = registry();
  register(h, id);
  register(h, stranger);
  assert.equal(h.call("presentCredential", [id, 0n, challenge]).result, true);
  assert.equal(h.call("presentCredential", [stranger, 0n, challenge]).result, true);
  assert.equal(h.ledger().presentationNullifiers.size(), 2n);
});
