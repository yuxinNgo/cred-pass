"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Credential } from "@/modules/credentials/model";
import { issueCredential, type IssueInput } from "@/modules/issuers/issue";
import { demoCredentials } from "./demo-data";

interface WalletState {
  credentials: Credential[];
  now: number;
  issue: (input: IssueInput) => Credential;
  clear: () => void;
  restore: () => void;
}
const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentials] = useState(demoCredentials);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, []);
  function issue(input: IssueInput) {
    const credential = issueCredential(input, Date.now(), crypto.randomUUID());
    setCredentials((current) => [credential, ...current]);
    return credential;
  }
  return <WalletContext.Provider value={{ credentials, now, issue, clear: () => setCredentials([]), restore: () => setCredentials(demoCredentials) }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("WalletProvider is required.");
  return wallet;
}
