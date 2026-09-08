"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { developmentAdapter } from "@/adapters/midnight/development";
import { credentialTypes, typeLabels, type CredentialType } from "@/modules/credentials/model";
import { useWallet } from "@/store/wallet";
import { Icon } from "@/shared/icon";
import type { VerificationResult } from "./model";

export function VerificationScreen({ initialId = "" }: { initialId?: string }) {
  const { credentials } = useWallet();
  const [requiredType, setRequiredType] = useState<CredentialType>("student");
  const [credentialId, setCredentialId] = useState(initialId);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setResult(null); setError("");
    try { setResult(await developmentAdapter.verify(credentials, { credentialId, requiredType }, Date.now())); }
    catch { setError("The local verifier could not complete the check. Please try again."); }
    finally { setPending(false); }
  }
  return <>
    <div className="page-heading"><div><h1>Prove the requirement.<br/>Not your identity.</h1><p className="intro">A verification sandbox with a deliberately small disclosure surface.</p></div></div>
    <div className="notice">Local development check—not a zero-knowledge proof. No wallet connection, network request, or on-chain verification occurs.</div>
    <div className="verification-grid"><section className="panel"><span className="step-label">01 / HOLDER WORKSPACE</span><h2>Respond to a request</h2><form onSubmit={verify}>
      <label htmlFor="requiredType">Requested credential</label><select id="requiredType" value={requiredType} disabled={pending} onChange={(event) => { setRequiredType(event.target.value as CredentialType); setResult(null); }}>{credentialTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select>
      <div className="request-quote">“Prove you hold a valid {typeLabels[requiredType]}.”</div>
      <label htmlFor="credentialId">Credential to use</label><select id="credentialId" value={credentialId} disabled={pending} onChange={(event) => { setCredentialId(event.target.value); setResult(null); }}><option value="">No credential selected</option>{credentials.map((credential) => <option key={credential.id} value={credential.id}>{typeLabels[credential.type]} · {credential.issuer} · {credential.id.slice(0, 8)}</option>)}</select>
      <p className="field-help">Selecting none, an expired credential, or a different type returns INVALID.</p>
      {credentials.length === 0 && <p className="field-help">Wallet empty. <Link className="text-link" href="/issuer">Issue a demo credential</Link> first, or test the missing-credential result.</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" className="button primary" disabled={pending}><Icon name="shield" size={17}/>{pending ? "Checking credential…" : "Verify credential"}</button>
    </form><div className="check-list"><p><Icon name="check" size={14}/>Credential exists in this wallet</p><p><Icon name="check" size={14}/>Credential type matches the request</p><p><Icon name="check" size={14}/>Issued, unexpired, and not revoked</p></div></section>
    <section className="verifier-panel" aria-live="polite" aria-busy={pending}><span className="step-label">02 / VERIFIER VIEW</span><h2>Only the answer leaves.</h2><p className="caption">This is the full verifier-facing payload.</p><div className={`result-box ${result?.result === "VALID" ? "valid" : result ? "invalid" : "waiting"}`}><Icon name={result?.result === "VALID" ? "check" : "shield"} size={34}/><strong>{result?.result ?? "Awaiting verification"}</strong><span>{result ? "Local check completed" : "Select a credential and run a check"}</span></div>
      <pre className="payload">{result ? JSON.stringify(result, null, 2) : '{\n  "result": "pending"\n}'}</pre>
      <div className="disclosure-note"><Icon name="lock" size={17}/><p>No holder name. No private reference.<br/>No credential metadata in the result.</p></div>
      <p className="caption">Result is a local point-in-time check, not an authenticated or reusable proof.</p>
    </section></div>
  </>;
}
