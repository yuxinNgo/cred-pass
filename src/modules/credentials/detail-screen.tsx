"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@/store/wallet";
import { CredentialCard } from "./card";
import { credentialStatus, typeLabels } from "./model";
import { formatDate } from "@/shared/date";
import { Icon } from "@/shared/icon";

export function CredentialDetail({ id }: { id: string }) {
  const { credentials, now, busy, revoke } = useWallet();
  const [error, setError] = useState("");
  const credential = credentials.find((item) => item.id === id);
  if (!credential) return <div className="empty-state"><Icon name="wallet" size={36}/><h1>Credential not found</h1><p>This credential does not exist in your current browser workspace.</p><Link href="/wallet" className="button">Back to wallet</Link></div>;
  const status = credentialStatus(credential, now);
  async function revokeCredential() {
    if (!window.confirm("Revoke this demo credential? Future verification will return INVALID. This cannot be undone for this credential. Restore samples replaces the whole wallet; this is not issuer or on-chain revocation.")) return;
    setError("");
    try { await revoke(id); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to revoke credential. Reload the wallet to check its status before retrying."); }
  }
  return <>
    <Link href="/wallet" className="text-link back-link">Back to my credentials</Link>
    <div className="page-heading"><div><h1>{typeLabels[credential.type]}</h1><p className="intro">Issued by {credential.issuer}</p></div><span className={`status detail-status ${status}`}>{now === 0 ? "Checking…" : status}</span></div>
    <div className="detail-grid"><div><CredentialCard credential={credential} now={now}/><p className="caption">Development credential · not an on-chain asset</p><Link href={`/verify?credential=${credential.id}`} className="button primary full-width">Use for verification<Icon name="arrow" size={17}/></Link><div className="private-section"><h3>Demo revocation</h3><p>Only this credential in your browser workspace is affected. This is not issuer or on-chain revocation.</p>{status === "revoked" ? <p role="status">Revoked. Verification returns INVALID. This credential cannot be reactivated.</p> : <button className="button full-width" disabled={busy} onClick={() => { void revokeCredential(); }}>{busy ? "Saving wallet changes…" : "Revoke demo credential"}</button>}{error && <p role="alert">{error}</p>}</div></div>
    <div className="panel"><h2>Credential details</h2><dl className="details-list"><div><dt>Credential type</dt><dd>{typeLabels[credential.type]}</dd></div><div><dt>Issuer</dt><dd>{credential.issuer}</dd></div><div><dt>Issued</dt><dd>{formatDate(credential.issuedAt)}</dd></div><div><dt>Expires</dt><dd>{formatDate(credential.expiresAt)} at 00:00 UTC</dd></div><div><dt>Credential ID</dt><dd className="mono">{credential.id}</dd></div></dl>
    <div className="private-section"><h3><Icon name="lock" size={16}/>Wallet-only metadata</h3><p>Visible here to the holder. Never included in the verifier result.</p><dl className="details-list"><div><dt>Holder name</dt><dd>{credential.privateMetadata.holderName}</dd></div><div><dt>Private reference</dt><dd>{credential.privateMetadata.reference}</dd></div></dl></div></div></div>
  </>;
}
