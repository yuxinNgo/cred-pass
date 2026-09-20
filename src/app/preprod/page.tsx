"use client";

import { useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import deployments from "../../../deployments/preprod.json";
import { connectPreprodWallet, deriveWalletSecret } from "@/lib/midnight/extension-wallet";
import type { Providers } from "@/lib/midnight/providers";
import type { RegistryAction } from "@/lib/midnight/registry-contract";

type Snapshot = { credentialCount: string; revokedCount: string; presentationCount: string };

const walletMethods = [
  "getUnshieldedAddress",
  "getShieldedAddresses",
  "getConfiguration",
  "getProvingProvider",
  "balanceUnsealedTransaction",
  "submitTransaction",
  "signData",
] as const;

function bytesHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim())));
}

export default function PreprodPage() {
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [address, setAddress] = useState(deployments.contracts[0].contractAddress);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [credentialRef, setCredentialRef] = useState("");
  const [credentialType, setCredentialType] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const injected = Reflect.get(window, "midnight") as Record<string, InitialAPI> | undefined;
      const connected = await connectPreprodWallet(injected);
      await connected.hintUsage([...walletMethods]);
      const [{ walletProviders }, unshielded] = await Promise.all([
        import("@/lib/midnight/providers"),
        connected.getUnshieldedAddress(),
      ]);
      const nextProviders = await walletProviders(connected, window.location.origin);
      setApi(connected);
      setProviders(nextProviders);
      setWalletAddress(unshielded.unshieldedAddress);
      const { readRegistry } = await import("@/lib/midnight/registry-contract");
      setSnapshot(await readRegistry(nextProviders, address));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lace connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(current = address) {
    if (!providers) throw new Error("Connect Lace first.");
    const { readRegistry } = await import("@/lib/midnight/registry-contract");
    setSnapshot(await readRegistry(providers, current));
  }

  async function deploy() {
    if (!providers || !api || busy) return;
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const { deployRegistry } = await import("@/lib/midnight/registry-contract");
      const issuerSecret = await deriveWalletSecret(api, "cred-pass:issuer:v1");
      const result = await deployRegistry(providers, issuerSecret);
      setAddress(result.address);
      setTxId(result.txId);
      await refresh(result.address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registry deployment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function transact(action: RegistryAction) {
    if (!providers || !api || busy) return;
    if (!credentialRef.trim()) {
      setError("Enter a credential reference.");
      return;
    }
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const { callRegistry, holderCommitment } = await import("@/lib/midnight/registry-contract");
      const id = await digest(credentialRef);
      const type = BigInt(credentialType);
      let privateState;
      let args;

      if (action === "present") {
        privateState = { holderSecret: await deriveWalletSecret(api, "cred-pass:holder:v1") };
        args = { id, type, challenge: crypto.getRandomValues(new Uint8Array(32)) };
      } else {
        privateState = { issuerSecret: await deriveWalletSecret(api, "cred-pass:issuer:v1") };
        if (action === "register") {
          if (!expiresAt) throw new Error("Choose a credential expiration date.");
          const holderSecret = await deriveWalletSecret(api, "cred-pass:holder:v1");
          args = {
            id,
            type,
            expiresAt: BigInt(Math.floor(new Date(expiresAt).getTime() / 1000)),
            holderCommitment: holderCommitment(address, bytesHex(id), bytesHex(holderSecret)),
          };
        } else {
          args = { id };
        }
      }

      setTxId(await callRegistry(providers, address, privateState, action, args));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registry transaction failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 20px 72px" }}>
    <header className="page-heading" style={{ marginBottom: 24 }}>
      <div>
        <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.65 }}>CredPass · Midnight Preprod</p>
        <h1>Wallet-bound credential registry</h1>
        <p className="intro">Lace is the only identity and transaction gateway. The app never asks for an issuer key, holder key, or private seed.</p>
      </div>
      <button className="button primary" type="button" disabled={busy} onClick={() => { void connect(); }}>
        {busy ? "Connecting…" : api ? "Reconnect Lace" : "Connect Lace"}
      </button>
    </header>

    <section className="panel" style={{ marginBottom: 20 }}>
      <strong>{walletAddress ? "Connected on Preprod" : "Connect Lace to unlock registry actions"}</strong>
      <p>{walletAddress || "Lace 4.x is required."}</p>
      {api ? <>
        <label>Registry address<input value={address} maxLength={64} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} /></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button className="button" type="button" disabled={busy} onClick={() => { void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Cannot read registry.")); }}>Refresh registry</button>
          <button className="button" type="button" disabled={busy} onClick={() => { void deploy(); }}>Create new registry</button>
        </div>
        {snapshot ? <p role="status">Registered {snapshot.credentialCount} · Revoked {snapshot.revokedCount} · Presentations {snapshot.presentationCount}</p> : null}
      </> : null}
    </section>

    {api ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
      <section className="panel">
        <h2>Credential</h2>
        <label>Reference<input value={credentialRef} maxLength={160} placeholder="e.g. diploma-2026-1042" onChange={(event) => setCredentialRef(event.target.value)} /></label>
        <label>Type<select value={credentialType} onChange={(event) => setCredentialType(event.target.value)}><option value="0">Student</option><option value="1">Employment</option><option value="2">Professional</option></select></label>
      </section>

      <section className="panel">
        <h2>Issue or revoke</h2>
        <label>Expiration<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
        <button className="button primary" type="button" disabled={busy} onClick={() => { void transact("register"); }}>Issue to this wallet</button>
        <button className="button" type="button" disabled={busy} onClick={() => { void transact("revoke"); }}>Revoke credential</button>
      </section>

      <section className="panel">
        <h2>Present proof</h2>
        <p>The verifier challenge is generated once for each presentation and is never reused.</p>
        <button className="button primary" type="button" disabled={busy} onClick={() => { void transact("present"); }}>Present with Lace</button>
      </section>
    </div> : null}

    {busy ? <p role="status">Waiting for Lace and Preprod confirmation…</p> : null}
    {txId ? <p role="status">Confirmed: <a href={"https://explorer.preprod.midnight.network/transactions/" + txId} target="_blank" rel="noreferrer">{txId}</a></p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </main>;
}
