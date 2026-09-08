import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { newWorkspaceToken, RequestError, workspaceOwner } from "./security";

export const cookieName = "credpass_workspace";
export function workspace(request: NextRequest, allowNew = false) {
  const existing = request.cookies.get(cookieName)?.value;
  if (!existing && !allowNew) throw new RequestError("Open your wallet to establish a workspace.", 401);
  const token = existing ?? newWorkspaceToken();
  return { owner: workspaceOwner(token), newToken: existing ? undefined : token };
}
export function jsonResponse(value: unknown, token?: string) {
  const response = NextResponse.json(value, { headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
  if (token) response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
export function errorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof RequestError ? error.message : "Wallet storage is unavailable. Please try again later." }, { status: error instanceof RequestError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}
