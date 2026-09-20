import test from "node:test";
import assert from "node:assert/strict";
import { connectPreprodWallet, deriveWalletSecret } from "../src/lib/midnight/extension-wallet";

test("connects a v4 Lace extension only after it confirms Preprod", async () => {
  let requested = "";
  const api = { getConnectionStatus: async () => ({ status: "connected", networkId: "preprod" }) };
  const connected = await connectPreprodWallet({ mnLace: {
    apiVersion: "4.0.1",
    connect: async (network: string) => { requested = network; return api; },
  } });
  assert.equal(connected, api);
  assert.equal(requested, "preprod");
});

test("rejects missing, incompatible, disconnected and wrong-network extensions", async () => {
  await assert.rejects(connectPreprodWallet({}), /WALLET_MISSING/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "3.0.0", connect: async () => ({ getConnectionStatus: async () => ({ status: "connected", networkId: "preprod" }) }) } }), /WALLET_MISSING/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "4.0.1", connect: async () => ({ getConnectionStatus: async () => ({ status: "connected", networkId: "preview" }) }) } }), /WRONG_NETWORK/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "4.0.1", connect: async () => ({ getConnectionStatus: async () => ({ status: "disconnected" }) }) } }), /DISCONNECTED/);
});

test("binds registry private state to the Lace signing key and role", async () => {
  const api = {
    signData: async (data: string) => ({
      data,
      signature: "signed-cred-pass",
      verifyingKey: "issuer-wallet-key",
    }),
  };
  const issuer = await deriveWalletSecret(api, "cred-pass:issuer:v1");
  const holder = await deriveWalletSecret(api, "cred-pass:holder:v1");
  assert.equal(issuer.length, 32);
  assert.equal(holder.length, 32);
  assert.notDeepEqual(issuer, holder);
});
