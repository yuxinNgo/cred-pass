import type { NextRequest } from "next/server";
import { readWallet, mutateWallet } from "@/services/database/wallet-repository";
import { workspace, jsonResponse, errorResponse } from "@/services/http";
import { readMutation, RequestError } from "@/services/security";
import { revocationInput } from "@/services/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { const session = workspace(request, true); return jsonResponse({ credentials: await readWallet(session.owner) }, session.newToken); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await readMutation(request);
    const { owner } = workspace(request);
    if (body.action === "revoke") {
      return jsonResponse({ credentials: await mutateWallet(owner, { action: "revoke", ...revocationInput(body) }) });
    }
    if (body.action !== "clear" && body.action !== "restore") throw new RequestError("Choose clear or restore.");
    return jsonResponse({ credentials: await mutateWallet(owner, { action: body.action }) });
  } catch (error) { return errorResponse(error); }
}
