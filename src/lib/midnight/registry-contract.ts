import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits, type Ledger } from "../../../contracts/managed/contract/index.js";
import { witnesses, type PrivateState } from "./private-state";
import type { Providers } from "./providers";

const privateStateId = "credPass";
export const compiledRegistry = CompiledContract.make("CredPass", Contract<PrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets("contracts/managed"),
);

export function hex32(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("Expected a 32-byte hexadecimal value.");
  return Uint8Array.from(value.match(/../g)!, (byte) => Number.parseInt(byte, 16));
}

export function holderCommitment(address: string, id: string, secret: string): Uint8Array {
  return pureCircuits.holderKey(encodeContractAddress(address), hex32(id), hex32(secret));
}

export function publicRegistry(state: Ledger) {
  return {
    credentialCount: state.credentials.size().toString(),
    revokedCount: state.revoked.size().toString(),
    presentationCount: state.presentationNullifiers.size().toString(),
  };
}

type Tx = { public: { txId: string } };
type Calls = {
  registerCredential(id: Uint8Array, type: bigint, expiresAt: bigint, holderCommitment: Uint8Array): Promise<Tx>;
  revokeCredential(id: Uint8Array): Promise<Tx>;
  presentCredential(id: Uint8Array, type: bigint, challenge: Uint8Array): Promise<Tx>;
};
export type RegistryAction = "register" | "revoke" | "present";
type Arguments = { id?: Uint8Array; type?: bigint; expiresAt?: bigint; holderCommitment?: Uint8Array; challenge?: Uint8Array };

export async function runRegistryCircuit(calls: Calls, action: RegistryAction, args: Arguments): Promise<string> {
  if (args.id?.length !== 32) throw new Error("Missing 32-byte credential ID.");
  if (action === "revoke") return (await calls.revokeCredential(args.id)).public.txId;
  if (args.type === undefined || args.type < 0n || args.type > 2n) throw new Error("Invalid credential type.");
  if (action === "present") {
    if (args.challenge?.length !== 32 || args.challenge.every((byte) => byte === 0)) throw new Error("Missing verifier challenge.");
    return (await calls.presentCredential(args.id, args.type, args.challenge)).public.txId;
  }
  if (args.expiresAt === undefined || args.expiresAt <= 0n || args.holderCommitment?.length !== 32 || args.holderCommitment.every((byte) => byte === 0)) {
    throw new Error("Invalid credential registration.");
  }
  return (await calls.registerCredential(args.id, args.type, args.expiresAt, args.holderCommitment)).public.txId;
}

export async function readRegistry(providers: Providers, address: string) {
  hex32(address);
  const state = await providers.publicDataProvider.queryContractState(address);
  if (!state) throw new Error("Contract was not found on Preprod.");
  return publicRegistry(ledger(state.data));
}

export async function callRegistry(
  providers: Providers, address: string, privateState: PrivateState,
  action: RegistryAction, args: Arguments,
): Promise<string> {
  hex32(address);
  const contract = await findDeployedContract(providers, {
    compiledContract: compiledRegistry,
    contractAddress: address,
    privateStateId,
    initialPrivateState: privateState,
  });
  try {
    await providers.privateStateProvider.set(privateStateId, privateState);
    return await runRegistryCircuit(contract.callTx, action, args);
  } finally {
    await providers.privateStateProvider.remove(privateStateId);
  }
}

export async function deployRegistry(providers: Providers, issuerSecret: Uint8Array) {
  if (issuerSecret.length !== 32) throw new Error("A 32-byte issuer secret is required.");
  const deployed = await deployContract(providers, {
    compiledContract: compiledRegistry,
    privateStateId,
    initialPrivateState: { issuerSecret },
  });
  return { address: deployed.deployTxData.public.contractAddress, txId: deployed.deployTxData.public.txId };
}
