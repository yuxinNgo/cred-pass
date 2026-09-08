import type { NextRequest } from "next/server";
import { readProofCredential } from "@/services/database/wallet-repository";
import { workspace, jsonResponse, errorResponse } from "@/services/http";
import { readMutation } from "@/services/security";
import { verificationInput } from "@/services/validation";
import { developmentAdapter } from "@/adapters/midnight/development";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const input = verificationInput(await readMutation(request));
    const { owner } = workspace(request);
    return jsonResponse(await developmentAdapter.verify(await readProofCredential(owner, input.credentialId), input, Date.now()));
  } catch (error) { return errorResponse(error); }
}
