import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import type { SigningKey } from "@midnight-ntwrk/compact-runtime";
import type { Witnesses } from "../../../contracts/managed/contract/index.js";

export type PrivateState = {
  issuerSecret?: Uint8Array;
  holderSecret?: Uint8Array;
};

export const witnesses: Witnesses<PrivateState> = {
  issuerSecret: ({ privateState }) => {
    if (!privateState.issuerSecret) throw new Error("Missing issuerSecret");
    return [privateState, privateState.issuerSecret];
  },
  holderSecret: ({ privateState }) => {
    if (!privateState.holderSecret) throw new Error("Missing holderSecret");
    return [privateState, privateState.holderSecret];
  },
};

export function memoryPrivateState(): PrivateStateProvider<string, PrivateState> {
  let address = "";
  const states = new Map<string, PrivateState>();
  const keys = new Map<string, SigningKey>();
  const unsupported = async (): Promise<never> => {
    throw new Error("Private-state export is unavailable.");
  };
  return {
    setContractAddress(value) { address = value; },
    async set(id, value) { states.set(address + ":" + id, value); },
    async get(id) { return states.get(address + ":" + id) ?? null; },
    async remove(id) { states.delete(address + ":" + id); },
    async clear() { states.clear(); },
    async setSigningKey(id, value) { keys.set(id, value); },
    async getSigningKey(id) { return keys.get(id) ?? null; },
    async removeSigningKey(id) { keys.delete(id); },
    async clearSigningKeys() { keys.clear(); },
    exportPrivateStates: unsupported,
    importPrivateStates: unsupported,
    exportSigningKeys: unsupported,
    importSigningKeys: unsupported,
  };
}
