"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@/store/wallet";
import { Icon } from "@/shared/icon";
import { CredentialCard } from "./card";
import { credentialStatus, credentialTypes, typeLabels } from "./model";

export function WalletScreen({ overview = false }: { overview?: boolean }) {
  const { credentials, now, clear, restore } = useWallet();
  const [filter, setFilter] = useState("all");
  const visible = credentials.filter((item) => filter === "all" || item.type === filter);
  const active = credentials.filter((item) => credentialStatus(item, now) === "active").length;
  return <>
    <div className="page-heading"><div><h1>{overview ? "Your credentials, your control." : "My credentials"}</h1><p className="intro">{overview ? "Everything you need to prove. Nothing extra to share." : "A private view of the credentials in your demo wallet."}</p></div><Link className="button primary" href="/issuer"><Icon name="plus" size={17}/>Issue demo credential</Link></div>
    <div className="section-heading"><h2>{overview ? "Your wallet" : "Credential collection"}<span className="count">{credentials.length}</span></h2>{overview && <Link className="text-link" href="/wallet">View all credentials<Icon name="arrow" size={16}/></Link>}</div>
    {!overview && <div className="filters" aria-label="Filter credentials">{["all", ...credentialTypes].map((type) => <button key={type} aria-pressed={filter === type} className={filter === type ? "active" : ""} onClick={() => setFilter(type)}>{type === "all" ? "All credentials" : typeLabels[type as keyof typeof typeLabels]}</button>)}</div>}
    {visible.length ? <div className="credential-grid">{visible.map((credential) => <CredentialCard key={credential.id} credential={credential} now={now}/>)}</div> : <div className="empty-state"><Icon name="wallet" size={36}/><h2>{credentials.length ? "No credentials of this type" : "Your wallet is empty"}</h2><p>Issue a demo credential to explore the verification flow.</p><Link className="button primary" href="/issuer">Issue your first credential<Icon name="arrow" size={16}/></Link></div>}
    {overview && <div className="overview-stats"><div><span>In your wallet</span><strong>{credentials.length.toString().padStart(2, "0")}<small>credentials</small></strong></div><div><span>Ready to verify</span><strong>{now === 0 ? "—" : active.toString().padStart(2, "0")}<small>active credentials</small></strong></div><div className="privacy-stat"><Icon name="lock"/><div><strong>Details stay with you</strong><p>Verifier output contains only the result.<br/>Local checks in this development pass.</p></div></div></div>}
    {overview && <div className="dashboard-lower"><section className="verify-banner"><div className="verify-symbol"><Icon name="shield" size={28}/></div><h2>Prove a fact.<br/>Keep your identity.</h2><p>Try a student verification request. The verifier gets a yes or no—not your full credential.</p><Link className="button" href="/verify">Try verification<Icon name="arrow" size={17}/></Link></section><section className="how-it-works"><h2>A little less disclosure.</h2><p className="muted">A little more control.</p><ol><li><span>01</span><div><strong>Hold a credential</strong><p>Your demo issuer adds it to this wallet.</p></div></li><li><span>02</span><div><strong>Choose what to prove</strong><p>Select the credential a request needs.</p></div></li><li><span>03</span><div><strong>Share only the answer</strong><p>The result is valid or invalid. That’s it.</p></div></li></ol></section></div>}
    <div className="wallet-tools"><p><Icon name="lock" size={14}/>Demo data lives in this page session. Refresh resets it. Never enter real personal data.</p><div><button onClick={restore}>Restore samples</button><button onClick={clear}>Clear demo wallet</button></div></div>
  </>;
}
