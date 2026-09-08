import type { IssueInput } from "@/modules/issuers/issue";
import { credentialTypes, type CredentialType } from "@/modules/credentials/model";
import { RequestError } from "./security";

export function issuanceInput(body: Record<string, unknown>): IssueInput {
  if (typeof body.type !== "string" || typeof body.expiresOn !== "string" || typeof body.holderName !== "string") throw new RequestError("Type, expiration date, and demo holder name are required.");
  return { type: body.type, expiresOn: body.expiresOn, holderName: body.holderName };
}
export function verificationInput(body: Record<string, unknown>) {
  if (typeof body.credentialId !== "string" || body.credentialId.length > 96 || !credentialTypes.includes(body.requiredType as CredentialType)) throw new RequestError("Choose a supported credential type and credential.");
  return { credentialId: body.credentialId, requiredType: body.requiredType as CredentialType };
}
