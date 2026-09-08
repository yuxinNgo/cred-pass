import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { mutateWallet } from "@/services/database/wallet-repository";
import { workspace, jsonResponse, errorResponse } from "@/services/http";
import { readMutation, RequestError } from "@/services/security";
import { issuanceInput } from "@/services/validation";
import { issueCredential } from "@/modules/issuers/issue";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const body = await readMutation(request);
    const { owner } = workspace(request);
    const input = issuanceInput(body);
    let credential;
    try { credential = issueCredential(input, Date.now(), randomUUID()); }
    catch (error) { throw new RequestError(error instanceof Error ? error.message : "Invalid credential."); }
    const credentials = await mutateWallet(owner, { action: "issue", credential });
    return jsonResponse({ credential, credentials });
  } catch (error) { return errorResponse(error); }
}
