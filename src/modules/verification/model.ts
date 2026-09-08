import type { Credential, CredentialType } from "../credentials/model";

export interface VerificationRequest { credentialId: string; requiredType: CredentialType }
// This is the entire verifier-facing payload. No credential or private metadata.
export interface VerificationResult { result: "VALID" | "INVALID"; mode: "development" }
export interface CredentialProofAdapter {
  verify(credentials: readonly Credential[], request: VerificationRequest, now: number): Promise<VerificationResult>;
}
