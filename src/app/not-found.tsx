import Link from "next/link";
export default function NotFound() {
  return <div className="empty-state"><h1>This page is not in your wallet.</h1><p>Head back to your credentials to continue.</p><Link className="button primary" href="/wallet">Open wallet</Link></div>;
}
