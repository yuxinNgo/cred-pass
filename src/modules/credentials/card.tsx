import Link from "next/link";
import { credentialStatus, typeLabels, type Credential } from "./model";
import { Icon } from "@/shared/icon";
import { formatDate } from "@/shared/date";

export function CredentialCard({ credential, now }: { credential: Credential; now: number }) {
  const status = credentialStatus(credential, now);
  return <Link href={`/wallet/${credential.id}`} className={`credential-card ${credential.type}`}>
    <div className="card-top"><span className="card-icon"><Icon name={credential.type === "student" ? "id" : credential.type === "employment" ? "wallet" : "shield"} size={24}/></span><span className={`status ${status}`}>{now === 0 ? "Checking…" : status}</span></div>
    <div className="card-title"><span className="card-issuer">{credential.issuer}</span><h3>{typeLabels[credential.type]}</h3></div>
    <div className="card-bottom"><div><span className="tiny-label">EXPIRES</span><strong>{formatDate(credential.expiresAt)}</strong></div><Icon name="arrow"/></div>
  </Link>;
}
