export const credentialTypes = ["student", "employment", "professional"] as const;
export type CredentialType = (typeof credentialTypes)[number];
export type CredentialStatus = "active" | "expired" | "revoked";

export const typeLabels: Record<CredentialType, string> = {
  student: "Student Credential",
  employment: "Employment Credential",
  professional: "Professional Certificate",
};

export interface Credential {
  id: string;
  type: CredentialType;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "revoked";
  privateMetadata: { holderName: string; reference: string };
}

export function credentialStatus(credential: Credential, now: number): CredentialStatus {
  if (credential.status === "revoked") return "revoked";
  return Date.parse(credential.expiresAt) > now ? "active" : "expired";
}
