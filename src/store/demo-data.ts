import type { Credential } from "@/modules/credentials/model";

export const demoCredentials: Credential[] = [
  { id: "northstar-student", type: "student", issuer: "Northstar University", issuedAt: "2026-01-15T00:00:00.000Z", expiresAt: "2030-01-15T00:00:00.000Z", status: "active", privateMetadata: { holderName: "Alex Morgan (demo)", reference: "NSU-2026-0842" } },
  { id: "meridian-employment", type: "employment", issuer: "Meridian Studio", issuedAt: "2026-02-01T00:00:00.000Z", expiresAt: "2030-02-01T00:00:00.000Z", status: "active", privateMetadata: { holderName: "Alex Morgan (demo)", reference: "MER-EMP-0218" } },
  { id: "design-professional", type: "professional", issuer: "Open Design Institute", issuedAt: "2024-04-01T00:00:00.000Z", expiresAt: "2025-04-01T00:00:00.000Z", status: "active", privateMetadata: { holderName: "Alex Morgan (demo)", reference: "ODI-CERT-0733" } },
];
