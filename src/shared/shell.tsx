"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

const navigation = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/wallet", label: "My credentials", icon: "wallet" },
  { href: "/verify", label: "Verification", icon: "shield" },
  { href: "/issuer", label: "Demo issuer", icon: "plus" },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <a className="skip-link" href="#content">Skip to content</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Icon name="id" size={24}/></span>credpass<span className="brand-dot">.</span></Link>
      <div className="workspace-label">PERSONAL WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(({ href, label, icon }) => <Link key={href} href={href} className={`nav-link ${pathname === href || (href === "/wallet" && pathname.startsWith("/wallet/")) ? "selected" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon name={icon}/>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><Icon name="lock"/><strong>Your wallet. Your control.</strong><p>Share the answer.<br/>Keep the details.</p><span className="demo-indicator">Local demo · no network</span></div>
    </aside>
    <div className="main-shell"><header className="topbar"><span>Personal wallet <span className="slash">/</span> {navigation.find((item) => item.href === pathname)?.label ?? "Credential details"}</span><span className="profile"><span className="avatar">D</span>Demo wallet</span></header><main id="content">{children}</main><footer>CredPass · First development pass <span>Midnight integration: prototype</span></footer></div>
  </div>;
}
