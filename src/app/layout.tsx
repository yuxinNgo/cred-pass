import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/shared/shell";
import { WalletProvider } from "@/store/wallet";

export const metadata: Metadata = {
  title: "CredPass — Your credentials, your control",
  description: "A local credential wallet prototype. Prove the requirement, not your identity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WalletProvider><Shell>{children}</Shell></WalletProvider></body></html>;
}
