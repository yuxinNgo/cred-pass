"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="empty-state"><h1>We couldn’t open this screen.</h1><p>Try again to reload your saved demo wallet. Refreshing does not erase your credentials.</p><button className="button primary" onClick={reset}>Try again</button></div>;
}
