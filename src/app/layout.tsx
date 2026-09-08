import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/shared/shell";
import { WalletProvider } from "@/store/wallet";

export const metadata: Metadata = {
  title: "CredPass — Your credentials, your control",
  description: "An encrypted demo credential wallet with minimal verification results. Midnight proofs remain a prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WalletProvider><Shell>{children}</Shell></WalletProvider></body></html>;
}
