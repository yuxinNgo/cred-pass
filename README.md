# CredPass

**Review endpoints:** [Production wallet](https://cred-pass-production.up.railway.app) / [Midnight Preprod registry](https://cred-pass-production.up.railway.app/preprod) / [Product X](https://x.com/stlremit)

## Level 4 reviewer route

1. Open the production wallet and issue a fictional credential.
2. Verify only the minimum `VALID` or `INVALID` result is disclosed.
3. Open the Preprod registry, connect Lace, and inspect or submit a contract action.
4. Verify the public contract and transaction evidence below.

### Submission checklist

- **Public repository - Complete:** [yuxinNgo/cred-pass](https://github.com/yuxinNgo/cred-pass)
- **Live Preprod MVP - Complete:** [application](https://cred-pass-production.up.railway.app) and [contract console](https://cred-pass-production.up.railway.app/preprod)
- **Contract address - Complete:** [`f56f9b5cf1b02621cda5f3a8780cba215d28f6b7029eb28cb2aa805e14b5623f`](https://explorer.preprod.midnight.network/contracts/stream/f56f9b5cf1b02621cda5f3a8780cba215d28f6b7029eb28cb2aa805e14b5623f)
- **Deployment proof - Complete:** [transaction `00c1e601...4625`](https://explorer.preprod.midnight.network/transactions/00c1e601b0e834c72940bf80b6f741df0eafc1619be64eda997953f138aac74625) and [full deployment record](deployments/preprod.json)
- **Documentation - Complete:** [setup](#setup), [API and integration checks](#api-and-integration-checks), [code organization](#code-organization), and [contract notes](contracts/README.md)
- **CI/CD - Complete:** [release workflow](.github/workflows/ci.yml) plus Railway deployment from `main`
- **Product X profile - Complete:** [@stlremit](https://x.com/stlremit)
- **Demo video - Pending:** link will be added after recording
- **Meaningful commits - Complete:** [46+ commits](https://github.com/yuxinNgo/cred-pass/commits/main/)

Hosted on Railway with its own Neon database. Credential storage survives reloads
within the same browser workspace. A dedicated Lace-signed `/preprod` console reads
and submits registry transactions to three independently funded, indexer-verified
Compact deployments on Midnight Preprod. This is still a demo, not production identity
infrastructure.

CredPass explores proving a credential requirement without handing a verifier the full record. Student, Employment, and Professional Certificate credentials live in a card-first wallet with horizontal navigation, details, filters, active/expired status, and empty states. The demo issuer validates and saves new credentials; the verifier returns only `{ "result": "VALID" | "INVALID", "mode": "development" }`.

## Durable demo storage

Next.js Route Handlers use Neon PostgreSQL through `pg` and Drizzle. A module-scoped pool is limited to three connections, with 10-second connection and idle timeouts. On Vercel, the pool is attached to Fluid compute lifecycle handling; it also works on a persistent Railway Node process.

Each browser receives a random 256-bit workspace capability in an HttpOnly, SameSite=Lax cookie. The cookie is Secure whenever `NODE_ENV=production`, has path `/`, and expires after 30 days. Only its SHA-256 hash is stored as the database ownership key. Every credential query and mutation is scoped to that key; IDs supplied by another browser do not grant access. Client-supplied owner fields are ignored.

The first successful wallet load creates a workspace and seeds three fictional credentials in one transaction. Reloading preserves data, including an empty wallet. Clear and restore affect only the current workspace. Issuance locks its workspace row to enforce the 250-credential cap even with concurrent requests.

### Individual demo revocation

Open a credential’s details and choose **Revoke demo credential**. The confirmation explains the irreversible change; Cancel leaves the record unchanged. Accept persists `revoked` for that credential and current cookie-owned workspace only. Reloads preserve it, repeated revoke requests are harmless, and there is no individual reactivate operation. Expired credentials can also be revoked. The card/detail status reflects revocation and subsequent server verification returns `INVALID`, even when another tab still holds an active copy. Returned results remain point-in-time demo checks; rerun verification after changes in another tab. Changes to the loaded wallet invalidate the displayed result.

The existing explicit **Restore samples** action replaces the entire current wallet, removing issued credentials and recreating the original sample records with their initial statuses. Thus a revoked sample can reappear as active after this whole-wallet reset. Clear removes all current records. Neither action changes other workspaces. This is owner-controlled demo storage behavior, **not authenticated issuer revocation, a revocation registry, or on-chain Midnight revocation**.

**Cookie loss, expiry, clearing browser data, or moving to another browser/domain loses access to the old wallet.** There is no recovery/login flow; inaccessible rows remain until an operator removes them. This is anonymous capability-based isolation, not verified user authentication. There is no abuse prevention across unlimited new workspaces; use a protected demo deployment until rate limits and lifecycle cleanup are implemented.

## Privacy boundaries — read before using

- `privateMetadata` (holder name and reference) is encrypted before storage using AES-256-GCM with a fresh 96-bit nonce. Authenticated additional data binds ciphertext to the workspace hash and credential ID. Tampering, wrong keys, or swapping ciphertext between owners/credentials fails closed.
- **The server holds the encryption key and can decrypt metadata. This is server-readable encrypted demo storage, not end-to-end encryption or a ZK proof.** Use fictional information only.
- Type, issuer, timestamps, status, IDs, and workspace hash remain plaintext database fields. The holder API returns the current browser’s decrypted metadata over HTTPS for the details screen.
- The verifier server query selects only validity fields and never fetches/decrypts the metadata column. Its response omits names, references, issuer, credential ID, and all credential metadata.
- Mutations require an exact same-origin Origin header, JSON object body, and at most 8 KiB of streamed input. Validation occurs server-side before issuance. Database failures return generic errors; secrets and metadata are not logged.
- Missing database/key configuration shows an unavailable/retry screen. There is **no silent in-memory fallback**. An uncertain failed mutation is not automatically retried; reload the wallet before issuing again to avoid duplicates.
- The browser owner can inspect holder data and client state. The verifier is a demo view, not a separate authenticated external application. Do not use its result for access control.

Expiration is strict: `now < expiresAt`; equality means expired. Issuer dates expire at **00:00 UTC at the start of that date**. Wallet labels update from the browser clock; actual verification evaluates existence, type, issuance, expiry, and revoked status using the server clock and persisted fields. Server time is not authenticated ledger time.

## Setup

Use Node.js 22+ (tested on 24.0.0) and pnpm 10.18.3. Install with `corepack pnpm install --frozen-lockfile`. Set these **server-only** variables in ignored `.env.local` or your hosting secret manager:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection URL, with the provider’s TLS parameters |
| `DATABASE_URL_UNPOOLED` | Direct connection URL for migrations only |
| `CREDENTIAL_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters encoding a securely generated random 32-byte key |
| `APP_ORIGIN` | Canonical deployed HTTPS origin with no path/trailing slash; required behind the production reverse proxy |

Never prefix these with `NEXT_PUBLIC_`, put them in `next.config.ts`, commit secrets, or log secrets. `APP_ORIGIN` is server configuration, not a secret; mutation checks compare against it instead of trusting forwarded-host headers. Unset origin falls back to the request origin only in development or localhost. Keep the encryption key stable and backed up; replacing or losing it makes existing metadata unreadable. Key rotation/re-encryption is not implemented. `.env.example` contains empty placeholders only.

```sh
corepack pnpm db:migrate
corepack pnpm dev
```

Open `http://localhost:3000`. The migration uses the direct URL and the checked-in Drizzle SQL/journal, and can safely be run again. To change the schema, edit `src/services/database/schema.ts`, run `corepack pnpm db:generate`, review the generated SQL, and apply it to a development Neon branch first. Runtime requests do not run migrations.

```sh
corepack pnpm lint
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start
```

The app builds without database/key variables because database setup is lazy and API routes are dynamic. Runtime storage requires them. `next start` listens on `0.0.0.0` and honors the platform’s `PORT` environment variable; use `--port 3114` locally when needed.

## API and integration checks

| Route | Behavior |
| --- | --- |
| `GET /api/wallet` | Establish browser workspace; return only its holder credentials; seed once |
| `POST /api/credentials` | Validated `{type, expiresOn, holderName}` issuance |
| `POST /api/wallet` | Explicit `{action: "clear" | "restore"}` scoped reset, or `{action: "revoke", credentialId}` individual demo revocation; unknown/unowned ID returns 404 |
| `POST /api/verify` | `{credentialId, requiredType}`; server-side minimal VALID/INVALID result |
| `GET /api/health` | Generic DB probe: `{"status":"ok"}` or 503 `{"status":"unavailable"}` |

Responses are no-store; there is no public credential listing. Health intentionally probes connectivity only, not every schema/key requirement.

Unit checks cover expiration boundaries, malformed/future dates, type mismatch, missing/revoked credentials, issuance lifecycle, nonce uniqueness, encryption roundtrip/tampering/substitution, workspace tokens, JSON/origin/body limits, and HTTP input validation.

With a running app connected to a **disposable migrated database**, run:

```sh
corepack pnpm test:integration
```

Set `INTEGRATION_BASE_URL` if not `http://localhost:3114`. The integration script creates two temporary workspaces and verifies persistence, plaintext omission in stored metadata, cross-owner isolation, verification output, revocation persistence/idempotency and stale-client rejection, missing-cookie/foreign-origin rejection, clear/restore, a 250-row cap, and ciphertext substitution rejection. It writes test rows only into those two workspaces and deletes them in `finally`. It requires the same `DATABASE_URL` as the app; do not point it at unrelated data.

HTTP checks time out after 20 seconds per request. Without a listening app, `node --conditions=react-server --import tsx scripts/integration.ts --direct` runs the same assertions through real Next.js route handlers and the configured database in-process. Set `APP_ORIGIN` to match `INTEGRATION_BASE_URL` (default `http://localhost:3114`). Direct mode does not test HTTP serving or browser behavior.

## Hosting

`railway.json` uses Railpack, `pnpm build`, `pnpm start`, and `/api/health`. Configure the pooled database URL and encryption key as Railway runtime secrets, set `APP_ORIGIN` to the exact HTTPS deployment origin, and run the direct-URL migration as an explicit setup step before deployment. Do not change GitHub/Railway account identity implicitly; each repository is intended to have its own deployment/account ownership.

Vercel is compatible as an alternative: use the Next.js preset, the same server-only variables, and a separate project. The pool lifecycle helper is enabled only when `VERCEL` exists. No infrastructure is provisioned by the app or build.

## Code organization

```text
src/app/                    App Router pages and same-origin server APIs
src/modules/credentials/    Model, cards, wallet, holder-only detail views
src/modules/issuers/        Issuance validation and demo issuer screen
src/modules/verification/   Request/result contract and verification screen
src/services/database/     Typed schema, lazy pooled connection, scoped repository
src/services/              Capability, encryption, HTTP and validation boundaries
src/adapters/midnight/      Isolated development proof adapter
src/store/                 Async wallet state and fictional seed data
src/shared/                Horizontal navigation, icons, UTC date formatting
drizzle/                   Versioned SQL migration and metadata
scripts/                   Explicit migration and disposable DB integration checks
contracts/                 Compact source, Preprod adapter, and contract tests
tests/                     Node test runner + tsx
```

Next.js 16.3.4, React 19.2.8, TypeScript 5.9.3, Tailwind 4.3.3, ESLint, pnpm, PostgreSQL, pg, and Drizzle. One Next.js codebase; no separate backend service.

## Midnight status and next milestones

The database API's development adapter remains ordinary tested TypeScript. Direct chain access is isolated in the `/preprod` console, which uses Lace and the generated Compact client. `contracts/credential-registry.compact` is release-compiled with **Compact compiler 0.31.1, language 0.23.0, and runtime 0.16.0**. Full prover, verifier, and ZKIR assets were used for the Preprod transactions below. Sixteen contract/runtime tests cover issuer authorization, holder/deployment binding, expiry, irreversible revocation, challenge-bound presentations, atomic rejection, privacy boundaries, and replay resistance.

| Deployment wallet | Contract | Deploy proof | Registry activity |
|---|---|---|---|
| 02 | [`f56f9b5c…623f`](https://explorer.preprod.midnight.network/contracts/stream/f56f9b5cf1b02621cda5f3a8780cba215d28f6b7029eb28cb2aa805e14b5623f) | [`00c1e601…4625`](https://explorer.preprod.midnight.network/transactions/00c1e601b0e834c72940bf80b6f741df0eafc1619be64eda997953f138aac74625) | [`registerCredential`](https://explorer.preprod.midnight.network/transactions/007d625ae54d26a50c86f0e5b8a6c6315926777f859e4674810f1e3fe1e2244ec9) |
| 03 | [`367b96eb…ac9d`](https://explorer.preprod.midnight.network/contracts/stream/367b96ebc3eb73032957c5600ad258521f7596dac3079acbb8b279a1d613ac9d) | [`00002cc5…46eb0`](https://explorer.preprod.midnight.network/transactions/00002cc5f8e11e4fafdff543750f619e4d4a92d4f3c533c0f490fce30d50746eb0) | [`registerCredential`](https://explorer.preprod.midnight.network/transactions/001aa7bf4c11f1a46923271512bb82d83d3a0511112e098f45747bc4bf6ff21da7) |
| imported | [`9ae90cce…14c6`](https://explorer.preprod.midnight.network/contracts/stream/9ae90ccec24dc2fec53772a577957ad016c262858e88d51fff44b2d1aa6314c6) | [`002f1c0c…4f16`](https://explorer.preprod.midnight.network/transactions/002f1c0cbaf6eac0ce362fdb1f69edd74f35f6d37cb56e4841d092776f3b494f16) | [`register → present`](https://explorer.preprod.midnight.network/transactions/00700bc416a51c785e83faea83f00e1d2ade0cfe2e17668b2351e621de12b0d2a9) |

All seven deployment/smoke transactions were independently read back from the indexer with status `SucceedEntirely`. The imported canary registered one credential, presented it once, then rejected reuse of the same verifier challenge before broadcast. The complete public record is [deployments/preprod.json](deployments/preprod.json).

Next: harden the existing Lace/proof-provider integration with secure holder key recovery and operational monitoring; establish trusted real-world issuer identity and external verifier freshness rules; add abuse controls and storage cleanup before opening a public service. Full revocation governance, composite proofs, identity networks, and advanced selective disclosure remain outside this pass.

References: [Compact](https://docs.midnight.network/compact/reference/compact-reference), [Drizzle migrations](https://orm.drizzle.team/docs/migrations), [pg pooling](https://node-postgres.com/apis/pool), [Next.js runtime configuration](https://nextjs.org/docs/app/api-reference/cli/next), [Railway config](https://docs.railway.com/config-as-code/reference).
