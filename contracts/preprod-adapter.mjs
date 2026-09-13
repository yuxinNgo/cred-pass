import { fileURLToPath } from "node:url";
import { Contract, ledger, pureCircuits } from "./managed/contract/index.js";

const required = (privateState, key) => {
  const value = privateState[key];
  if (value === undefined) throw new Error(`Missing CredPass witness: ${key}`);
  return [privateState, value];
};

export const contractName = "CredPass";
export const privateStateId = "credPass";
export const artifactDirectory = fileURLToPath(new URL("./managed/", import.meta.url));
export const witnesses = {
  issuerSecret: ({ privateState }) => required(privateState, "issuerSecret"),
  holderSecret: ({ privateState }) => required(privateState, "holderSecret"),
};

export function publicSnapshot(data) {
  const state = ledger(data);
  return {
    credentialCount: Number(state.credentials.size()),
    revokedCount: Number(state.revoked.size()),
    presentationCount: Number(state.presentationNullifiers.size()),
  };
}

export { Contract, ledger, pureCircuits };
