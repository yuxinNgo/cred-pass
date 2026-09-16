"use client";

import { useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import deployments from "../../../deployments/preprod.json";
import { connectPreprodWallet } from "@/lib/midnight/extension-wallet";
import type { Providers } from "@/lib/midnight/providers";
import type { RegistryAction } from "@/lib/midnight/registry-contract";

type Snapshot = { credentialCount: string; revokedCount: string; presentationCount: string };

export default function PreprodPage() {
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [address, setAddress] = useState(deployments.contracts[0].contractAddress);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [issuer, setIssuer] = useState("");
  const [holder, setHolder] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialType, setCredentialType] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");
  const [holderCommitment, setHolderCommitment] = useState("");
  const [challenge, setChallenge] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true); setError("");
    try {
      const injected = Reflect.get(window, "midnight") as Record<string, InitialAPI> | undefined;
      const connected = await connectPreprodWallet(injected);
      const [{ walletProviders }, unshielded] = await Promise.all([
        import("@/lib/midnight/providers"), connected.getUnshieldedAddress(),
      ]);
      setProviders(await walletProviders(connected, window.location.origin));
      setApi(connected); setWalletAddress(unshielded.unshieldedAddress);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Wallet connection failed."); }
    finally { setBusy(false); }
  }

  async function refresh(current = address) {
    if (!providers) throw new Error("Connect Lace first.");
    const { readRegistry } = await import("@/lib/midnight/registry-contract");
    setSnapshot(await readRegistry(providers, current));
  }

  async function read() {
    setBusy(true); setError("");
    try { await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot read contract."); }
    finally { setBusy(false); }
  }

  async function deriveCommitment() {
    setError("");
    try {
      const { holderCommitment } = await import("@/lib/midnight/registry-contract");
      setHolderCommitment(Array.from(holderCommitment(address, credentialId, holder), (byte) => byte.toString(16).padStart(2, "0")).join(""));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not derive holder commitment."); }
  }

  async function deploy() {
    if (!providers || !api || busy || !window.confirm("Deploy a NEW Preprod credential registry? Save the issuer secret privately first; Lace will request approval.")) return;
    setBusy(true); setError(""); setTxId("");
    try {
      const { deployRegistry, hex32 } = await import("@/lib/midnight/registry-contract");
      const result = await deployRegistry(providers, hex32(issuer));
      setAddress(result.address); setTxId(result.txId); setIssuer("");
      try { await refresh(result.address); } catch { setError("Transaction submitted; refresh the registry separately before retrying."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Deployment failed. Check the explorer before retrying."); }
    finally { setBusy(false); }
  }

  async function transact(action: RegistryAction) {
    if (!providers || !api || busy || !window.confirm(`Submit ${action} to Midnight Preprod? Lace will request approval.`)) return;
    setBusy(true); setError(""); setTxId("");
    try {
      const { callRegistry, hex32 } = await import("@/lib/midnight/registry-contract");
      const privateState = action === "present" ? { holderSecret: hex32(holder) } : { issuerSecret: hex32(issuer) };
      const args = action === "register"
        ? { id: hex32(credentialId), type: BigInt(credentialType), expiresAt: BigInt(expiresAt), holderCommitment: hex32(holderCommitment) }
        : action === "present"
          ? { id: hex32(credentialId), type: BigInt(credentialType), challenge: hex32(challenge) }
          : { id: hex32(credentialId) };
      const id = await callRegistry(providers, address, privateState, action, args);
      setTxId(id); setIssuer(""); setHolder("");
      try { await refresh(); } catch { setError("Transaction submitted; refresh the registry separately before retrying."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Transaction failed. Check the explorer before retrying."); }
    finally { setBusy(false); }
  }

  return <section className="preprod-console" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 20 }}>
    <header className="page-heading"><div><h1>Midnight Preprod registry</h1><p className="intro">Wallet-signed contract actions. This registry is separate from the encrypted database demo wallet.</p></div></header>
    <div className="panel"><h2>Connect and inspect</h2><button className="button primary" type="button" disabled={busy} onClick={() => { void connect(); }}>{api ? "Reconnect Lace" : "Connect Lace extension"}</button>{walletAddress && <p>Connected: <code>{walletAddress}</code></p>}
      <label>Registry address <input value={address} maxLength={64} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} /></label>
      <button className="button" type="button" disabled={busy || !providers} onClick={() => { void read(); }}>Read confirmed public state</button>
      {snapshot && <p role="status">Registered: {snapshot.credentialCount} · Revoked: {snapshot.revokedCount} · Presentations: {snapshot.presentationCount}</p>}
    </div>
    <div className="panel"><h2>Issuer controls</h2><fieldset disabled={busy || !providers} style={{ display: "grid", gap: 12 }}>
      <label>Issuer secret (32-byte hex) <input type="password" value={issuer} maxLength={64} autoComplete="off" onChange={(event) => setIssuer(event.target.value.trim())} /></label>
      <button className="button" type="button" onClick={() => { void deploy(); }}>Deploy new registry contract</button>
      <label>Credential ID (32-byte hex) <input value={credentialId} maxLength={64} onChange={(event) => setCredentialId(event.target.value.trim())} /></label>
      <label>Credential type <select value={credentialType} onChange={(event) => setCredentialType(event.target.value)}><option value="0">Student</option><option value="1">Employment</option><option value="2">Professional</option></select></label>
      <label>Expiration (Unix seconds) <input inputMode="numeric" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
      <label>Holder commitment (32-byte hex) <input value={holderCommitment} maxLength={64} onChange={(event) => setHolderCommitment(event.target.value.trim())} /></label>
      <div><button className="button" type="button" onClick={() => { void transact("register"); }}>Register credential</button> <button className="button" type="button" onClick={() => { void transact("revoke"); }}>Revoke credential</button></div>
    </fieldset></div>
    <div className="panel"><h2>Holder presentation</h2><fieldset disabled={busy || !providers} style={{ display: "grid", gap: 12 }}>
      <label>Holder secret (32-byte hex) <input type="password" value={holder} maxLength={64} autoComplete="off" onChange={(event) => setHolder(event.target.value.trim())} /></label>
      <button className="button" type="button" onClick={() => { void deriveCommitment(); }}>Derive holder commitment for issuer registration</button>
      <label>Verifier challenge (32-byte hex, single use) <input value={challenge} maxLength={64} onChange={(event) => setChallenge(event.target.value.trim())} /></label>
      <button className="button primary" type="button" onClick={() => { void transact("present"); }}>Present on-chain proof</button>
    </fieldset></div>
    {busy && <p role="status">Waiting for Lace and Preprod confirmation…</p>}
    {txId && <p role="status">Confirmed transaction: <a href={`https://explorer.preprod.midnight.network/transactions/${txId}`} target="_blank" rel="noreferrer">{txId}</a></p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
