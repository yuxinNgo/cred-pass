import { credentialTypes, type Credential, type CredentialType } from "../credentials/model";

export interface IssueInput { type: string; expiresOn: string; holderName: string }
export function issueCredential(input: IssueInput, now: number, id: string): Credential {
  const holderName = input.holderName.trim();
  if (!credentialTypes.includes(input.type as CredentialType)) throw new Error("Choose a supported credential type.");
  if (!holderName || holderName.length > 80) throw new Error("Holder name must be between 1 and 80 characters.");
  const expiresAt = Date.parse(`${input.expiresOn}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) || !Number.isFinite(expiresAt)
    || new Date(expiresAt).toISOString().slice(0, 10) !== input.expiresOn || expiresAt <= now) {
    throw new Error("Expiration must be a real future date. Credentials expire at 00:00 UTC on that date.");
  }
  return { id, type: input.type as CredentialType, issuer: "CredPass Demo Issuer", issuedAt: new Date(now).toISOString(), expiresAt: new Date(expiresAt).toISOString(), status: "active", privateMetadata: { holderName, reference: id } };
}
