# Public Compact registry — prototype only

`credential-registry.compact` supports single-issuer registration, holder-secret-bound validity, irreversible issuer revocation, and existence/type/expiry checks. It is **not connected to the web app** and must not be deployed with real credentials.

Validated with Compact compiler **0.26.0**, language **0.18.0**, and pinned development runtime **0.9.0** (on-chain runtime 0.3.0 in the lockfile). The installed compiler—not current-language assumptions—is the compatibility target.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm test:contract
```

This recompiles with `--skip-zk` and executes generated circuits against the actual Compact/ledger runtime, not a TypeScript model. On Windows it invokes `compactc` through WSL; elsewhere it uses PATH. `COMPACTC` can specify a compiler executable (a WSL path on Windows). A different compiler version fails explicitly. Generated output stays ignored.

Tests cover issuer/public-commitment impersonation rejection, duplicate/type validation, unauthorized/unknown-ID revocation, permanent/idempotent revocation, existence/type/strict expiry boundaries, nonzero clock uncertainty, and expired transcript replay rejection in the ledger VM. No database or server is needed. This does **not** generate proving keys, create or verify a ZK proof, deploy, submit transactions, or validate network consensus.

## Authorization and time

### Holder commitment flow

After a future contract deployment, the holder locally generates a high-entropy 32-byte secret and computes `persistentHash<Vector<4, Bytes<32>>>([pad(32, "credpass:holder:v1"), contractAddressBytes, credentialId, holderSecret])`. Address bytes use the runtime's `encodeContractAddress(address)`, not UTF-8 or the serialized address string. The issuer receives **only the commitment** and calls `registerDemoCredential(id, type, expiresAt, holderCommitment)` with its own issuer witness. All-zero commitments are rejected. The issuer must securely associate the commitment with the intended recipient; the circuit cannot authenticate the real person or validate that the issuer's chosen nonzero commitment is usable.

`checkDemoValidity(id, requiredType)` obtains the holder secret through the private `holderSecret()` witness and returns `true` only when its deployment/credential-bound hash matches and the credential is present, unrevoked, type-matching, and unexpired. A wrong secret, issuer secret, or public commitment substituted as a secret returns `false`. Knowing the holder secret does not authorize issuer mutations. Only the final Boolean is explicitly disclosed; the raw secret is not a circuit parameter or public ledger field. **Local `proofData.privateTranscriptOutputs` contains private witness material: never log, publish, or send it to a verifier.** No actual ZK proof is produced in this pass.

Tests execute both holders, copy commitments across credentials and deployment addresses, check unset commitments, compare public transcripts for different private witnesses, and retain all issuer/revocation/time checks. This is secret possession, not non-transferable ownership: sharing/stealing the secret transfers the ability to pass. Use fresh secrets and a secure holder-side store in any future integration; synthetic fixture arrays are not secure keys. There is no holder recovery or rotation. The holder commitment is public and credential IDs/metadata remain observable; binding does not make the registry private. No verifier challenge, one-time nullifier, or session binding prevents reuse of a valid result before expiry.

The constructor seals a domain-separated `persistentHash` of a private 32-byte issuer witness. Registration and revocation require that secret, following the official [bulletin-board secret ownership pattern](https://github.com/midnightntwrk/example-bboard/blob/main/contract/src/bboard.compact), adapted to compiler 0.26. Knowing the public commitment or claiming a wallet public key is insufficient. A future deployment must generate and securely retain a high-entropy secret; test arrays are synthetic fixtures, never deployment keys. This is proof-of-secret authorization, **not verification of a real institution's identity**. There is one fixed issuer, no rotation, recovery, or governance.

Revocation only inserts into a public set. There is no un-revoke, delete, overwrite, or issuer-update circuit; IDs cannot be registered again. Repeated authorized revocation is harmless, unknown IDs fail.

`checkDemoValidity(id, requiredType)` no longer accepts caller time. It uses `kernel.blockTimeLessThan(expiresAt)` with **Unix seconds**; equality means expired. See the [kernel reference](https://docs.midnight.network/compact/reference/ledger-adt#blocktimelessthan). The pinned runtime compares nominal `secondsSinceEpoch`, even with nonzero `secondsSinceEpochErr`; it is not a conservative upper-bound uncertainty check. Tests verify a true transcript at second 99 cannot replay at seconds 100/101 for expiry 100. Local contexts simulate block time; only future validated on-chain transactions provide authenticated network time. A local Boolean is not an access-control proof. The web demo uses milliseconds/server time; a future adapter must explicitly convert units.

## Intentional limitations

- Synthetic IDs, types, expiration, issuer/holder commitments, and revocation membership are public ledger data. Private witness inputs do **not** make this a private credential registry.
- No private credential-content commitment, verifier challenge binding, selective-disclosure/composite proof, or real-world issuer trust exists. Holder-secret and deployment binding are not challenge replay protection or verified human identity.
- Only types 0 (Student), 1 (Employment), and 2 (Professional) can be registered.

The UI, API, Neon storage, and development adapter remain the separate database-backed demonstration. Browser-owner demo revocation is not this issuer-authorized circuit. Next work is private credential content, verifier challenges, secure holder key handling, and a real adapter/proof flow, not deploying this public prototype. Keep names/references out of ledger state and use fictional data only. The registration ABI and public ledger record changed; there is no migration of previously deployed registries.
