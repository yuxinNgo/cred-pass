import type { CredentialProofAdapter } from "../../modules/verification/model";
import { credentialStatus } from "../../modules/credentials/model";

export const developmentAdapter: CredentialProofAdapter = {
  async verify(credentials, request, now) {
    const credential = credentials.find((item) => item.id === request.credentialId);
    const valid = credential !== undefined
      && credential.type === request.requiredType
      && Date.parse(credential.issuedAt) <= now
      && credentialStatus(credential, now) === "active";
    return { result: valid ? "VALID" : "INVALID", mode: "development" };
  },
};
