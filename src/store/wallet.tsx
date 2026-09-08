"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Credential } from "@/modules/credentials/model";
import type { IssueInput } from "@/modules/issuers/issue";
import type { VerificationRequest, VerificationResult } from "@/modules/verification/model";

interface WalletState {
  credentials: Credential[];
  now: number;
  loading: boolean;
  busy: boolean;
  error: string;
  retry: () => void;
  issue: (input: IssueInput) => Promise<Credential>;
  verify: (input: VerificationRequest) => Promise<VerificationResult>;
  clear: () => Promise<void>;
  restore: () => Promise<void>;
}
const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mutationRunning = useRef(false);
  const initialLoadStarted = useRef(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setCredentials((await walletRequest<{ credentials: Credential[] }>("/api/wallet")).credentials); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to load wallet."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!initialLoadStarted.current) { initialLoadStarted.current = true; void refresh(); }
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [refresh]);
  async function mutate(body: IssueInput | { action: "clear" | "restore" }) {
    if (mutationRunning.current) throw new Error("A wallet update is already in progress.");
    mutationRunning.current = true; setBusy(true);
    try {
      const result = await walletRequest<{ credentials: Credential[]; credential?: Credential }>("action" in body ? "/api/wallet" : "/api/credentials", body);
      setCredentials(result.credentials);
      return result;
    } finally { mutationRunning.current = false; setBusy(false); }
  }
  async function issue(input: IssueInput) {
    const result = await mutate(input);
    if (!result.credential) throw new Error("The server did not return the issued credential.");
    return result.credential;
  }
  async function changeSamples(action: "clear" | "restore") {
    try { await mutate({ action }); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to update wallet."); }
  }
  return <WalletContext.Provider value={{ credentials, now, loading, busy, error, retry: () => { void refresh(); }, issue, verify: (input) => walletRequest<VerificationResult>("/api/verify", input), clear: () => changeSamples("clear"), restore: () => changeSamples("restore") }}>{children}</WalletContext.Provider>;
}

async function walletRequest<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(url, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Wallet storage is unavailable.");
  return data as T;
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("WalletProvider is required.");
  return wallet;
}
