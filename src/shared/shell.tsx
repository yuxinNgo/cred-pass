"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

const navigation = [
  { href: "/preprod", label: "Credential registry", icon: "shield" },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <a className="skip-link" href="#content">Skip to content</a>
    <header className="wallet-header">
      <div className="topbar"><Link href="/" className="brand"><span className="brand-mark"><Icon name="id" size={24}/></span>credpass<span className="brand-dot">.</span></Link><div className="wallet-account"><span className="demo-indicator">Midnight Preprod</span><span className="profile"><span className="avatar">L</span>Lace wallet</span></div></div>
      <div className="navigation-bar"><nav aria-label="Main navigation">{navigation.map(({ href, label, icon }) => <Link key={href} href={href} className={`nav-link ${pathname === href ? "selected" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon name={icon}/>{label}</Link>)}</nav><span className="wallet-tagline"><Icon name="lock" size={13}/>Share the answer. Keep the details.</span></div>
    </header>
    <main id="content">{children}</main><footer>CredPass · Wallet-bound credentials <span>Midnight Preprod</span></footer>
  </div>;
}
