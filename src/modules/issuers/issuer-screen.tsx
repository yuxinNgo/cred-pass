"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useWallet } from "@/store/wallet";
import { credentialTypes, typeLabels, type Credential } from "@/modules/credentials/model";
import { CredentialCard } from "@/modules/credentials/card";
import { Icon } from "@/shared/icon";

export function IssuerScreen() {
  const { issue, now } = useWallet();
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Credential | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      setIssued(issue({ type: String(data.get("type") ?? ""), expiresOn: String(data.get("expiresOn") ?? ""), holderName: String(data.get("holderName") ?? "") }));
    } catch (error) { setError(error instanceof Error ? error.message : "Could not issue the credential. Please try again."); }
  }
  return <>
    <div className="page-heading"><div><h1>Issue a demo credential</h1><p className="intro">A small issuer workspace for the first development pass.</p></div></div>
    <div className="notice">Development only. No issuer authentication, signature, blockchain registration, or production trust. Use fictional information.</div>
    <div className="form-grid"><section className="panel"><h2>Credential information</h2><p className="caption">Issuer: CredPass Demo Issuer</p><form onSubmit={submit}>
      <label htmlFor="type">Credential type</label><select id="type" name="type" required>{credentialTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select>
      <label htmlFor="holderName">Demo holder name</label><input id="holderName" name="holderName" placeholder="e.g. Alex Morgan (demo)" required maxLength={80} aria-describedby="holder-help"/><p id="holder-help" className="field-help">Wallet-only metadata. Do not enter a real person’s information.</p>
      <label htmlFor="expiresOn">Expiration date</label><input id="expiresOn" name="expiresOn" type="date" required min={now ? new Date(now + 86400000).toISOString().slice(0, 10) : undefined} aria-describedby="expiry-help"/><p id="expiry-help" className="field-help">Expires at the start of this date (00:00 UTC).</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" type="submit"><Icon name="plus" size={17}/>Issue demo credential</button>
    </form></section><aside className="issuer-preview" aria-live="polite">{issued ? <><div className="success-heading"><Icon name="check" size={20}/><h2>Credential added to wallet</h2></div><CredentialCard credential={issued} now={now}/><Link href={`/wallet/${issued.id}`} className="button full-width">View credential<Icon name="arrow" size={17}/></Link><p className="caption">Available for this page session only. A refresh restores the original samples.</p></> : <div className="issuer-explainer"><Icon name="id" size={36}/><h2>One credential.<br/>Only the facts you need.</h2><p>Choose a type and expiration date. Your demo credential appears in the wallet immediately.</p><hr/><p>Issuance is local. A future Midnight adapter will handle authenticated registration and proof generation.</p></div>}</aside></div>
  </>;
}
