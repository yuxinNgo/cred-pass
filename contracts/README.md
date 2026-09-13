# CredPass Compact contract

The credential registry is release-compiled with Compact compiler **0.31.1**, language **0.23.0**, and `@midnight-ntwrk/compact-runtime` **0.16.0**.

```sh
corepack pnpm test:contract
corepack pnpm contract:compile
```

Complete prover, verifier, and ZKIR assets are generated under ignored `contracts/managed/`. `contracts/preprod-adapter.mjs` exposes only the generated contract boundary, strict witnesses, artifact directory, and aggregate public state.

## Contract flow

- The constructor seals a commitment to the private issuer secret.
- `registerCredential(id, type, expiresAt, holderCommitment)` is issuer-only, immutable per ID, and supports types 0–2.
- `revokeCredential(id)` is issuer-only and permanently inserts the registered ID into the public revocation set.
- `presentCredential(id, requiredType, challenge)` requires a nonzero verifier challenge, a registered/unrevoked/type-matching/unexpired credential, and possession of the deployment- and credential-bound holder secret.
- A successful presentation records a nullifier bound to the deployment, credential, holder commitment, and challenge. Reusing the same challenge for that credential is rejected atomically.

Credential IDs, types, expirations, holder commitments, revocations, presentation nullifiers, counts, and transaction metadata are public. Issuer and holder secrets are private witnesses; never log or publish private transcript outputs. A verifier must generate a fresh unpredictable challenge and reject stale challenges at its own boundary.

Secret possession is transferable if a holder leaks the secret. The contract does not prove real-world issuer identity, hide registry metadata, support selective disclosure, rotate/recover secrets, or erase records. The hosted credential UI/API remains a separate database-backed flow and does not submit Midnight transactions.

Confirmed Preprod addresses and transaction evidence are added only after indexer verification.
