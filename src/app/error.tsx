"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="empty-state"><h1>We couldn’t open this screen.</h1><p>Your demo wallet is temporary. Try again, or refresh to restore the samples.</p><button className="button primary" onClick={reset}>Try again</button></div>;
}
