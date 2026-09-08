import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function newWorkspaceToken() { return randomBytes(32).toString("base64url"); }
export function workspaceOwner(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || Buffer.from(token, "base64url").toString("base64url") !== token) throw new RequestError("Open your wallet to establish a workspace.", 401);
  return createHash("sha256").update(token).digest("hex");
}
function encryptionKey(key: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new Error("Credential encryption is not configured.");
  return Buffer.from(key, "hex");
}
export function encryptMetadata(value: object, key: string, binding: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), nonce);
  cipher.setAAD(Buffer.from(binding));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}
export function decryptMetadata(value: string, key: string, binding: string): unknown {
  const [version, nonce, tag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !nonce || !tag || !encrypted || extra !== undefined) throw new Error("Invalid encrypted metadata.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), Buffer.from(nonce, "base64"));
  decipher.setAAD(Buffer.from(binding));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8"));
}

export async function readMutation(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new RequestError("Same-origin requests only.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new RequestError("JSON body required.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("JSON body required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new RequestError("Request body too large.", 413); }
      chunks.push(value);
    }
    let parsed: unknown;
    try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new RequestError("Invalid JSON body."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RequestError("JSON object required.");
    return parsed as Record<string, unknown>;
  } finally { reader.releaseLock(); }
}
