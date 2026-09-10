# Public Compact registry — prototype only

`credential-registry.compact` supports single-issuer registration, irreversible issuer revocation, and existence/type/expiry checks. It is **not connected to the web app** and must not be deployed with real credentials.

Validated with Compact compiler **0.26.0**, language **0.18.0**, and pinned development runtime **0.9.0** (on-chain runtime 0.3.0 in the lockfile). The installed compiler—not current-language assumptions—is the compatibility target.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm test:contract
```

This recompiles with `--skip-zk` and executes generated circuits against the actual Compact/ledger runtime, not a TypeScript model. On Windows it invokes `compactc` through WSL; elsewhere it uses PATH. `COMPACTC` can specify a compiler executable (a WSL path on Windows). A different compiler version fails explicitly. Generated output stays ignored.

Tests cover issuer/public-commitment impersonation rejection, duplicate/type validation, unauthorized/unknown-ID revocation, permanent/idempotent revocation, existence/type/strict expiry boundaries, nonzero clock uncertainty, and expired transcript replay rejection in the ledger VM. No database or server is needed. This does **not** generate proving keys, create or verify a ZK proof, deploy, submit transactions, or validate network consensus.

## Authorization and time

The constructor seals a domain-separated `persistentHash` of a private 32-byte issuer witness. Registration and revocation require that secret, following the official [bulletin-board secret ownership pattern](https://github.com/midnightntwrk/example-bboard/blob/main/contract/src/bboard.compact), adapted to compiler 0.26. Knowing the public commitment or claiming a wallet public key is insufficient. A future deployment must generate and securely retain a high-entropy secret; test arrays are synthetic fixtures, never deployment keys. This is proof-of-secret authorization, **not verification of a real institution's identity**. There is one fixed issuer, no rotation, recovery, or governance.

Revocation only inserts into a public set. There is no un-revoke, delete, overwrite, or issuer-update circuit; IDs cannot be registered again. Repeated authorized revocation is harmless, unknown IDs fail.

`checkDemoValidity(id, requiredType)` no longer accepts caller time. It uses `kernel.blockTimeLessThan(expiresAt)` with **Unix seconds**; equality means expired. See the [kernel reference](https://docs.midnight.network/compact/reference/ledger-adt#blocktimelessthan). The pinned runtime compares nominal `secondsSinceEpoch`, even with nonzero `secondsSinceEpochErr`; it is not a conservative upper-bound uncertainty check. Tests verify a true transcript at second 99 cannot replay at seconds 100/101 for expiry 100. Local contexts simulate block time; only future validated on-chain transactions provide authenticated network time. A local Boolean is not an access-control proof. The web demo uses milliseconds/server time; a future adapter must explicitly convert units.

## Intentional limitations

- Synthetic IDs, types, expiration, issuer commitment, and revocation membership are public ledger data. Private issuer witness input does **not** make this a private credential registry.
- No private credential commitment, holder ownership, verifier challenge binding, selective-disclosure/composite proof, or real-world issuer trust exists. Time-bound transcript replay rejection is not holder/challenge replay protection.
- Only types 0 (Student), 1 (Employment), and 2 (Professional) can be registered.

The UI, API, Neon storage, and development adapter remain the separate database-backed demonstration. Browser-owner demo revocation is not this issuer-authorized circuit. Next work is private holder-bound credentials and a real adapter/proof flow, not deploying this public prototype. Keep names/references out of ledger state and use fictional data only.
