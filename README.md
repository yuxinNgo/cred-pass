# CredPass

**Current progress: ~30%** · First development pass · Local demo only

CredPass is a privacy-first credential wallet prototype. Instead of sharing a full student record, employment file, or professional certificate, the intended product lets a holder prove that the required credential exists and is valid. This pass builds the wallet and validates that workflow locally; it does not claim live blockchain privacy.

## Implemented

- Responsive Next.js dashboard and credential wallet with Student, Employment, and Professional Certificate types.
- Credential cards, type filters, holder-only details, active/expired/revoked domain states, and a working empty state.
- Demo issuance with type, holder-name, and strict future-date validation.
- Verification request and holder selection; existence, matching type, issued-at time, expiry, and revoked status are checked.
- Minimal verifier output: `{ "result": "VALID" | "INVALID", "mode": "development" }`.
- Isolated `CredentialProofAdapter` and local implementation; no blockchain calls scattered through components.
- A Compact registration/validity foundation that passes compiler checking with `--skip-zk`.
- Fourteen runnable tests covering expiration boundaries, malformed data, type mismatch, missing/revoked credentials, future issuance, metadata omission, and the issue → verify → expire lifecycle.

## Privacy and trust model

Private metadata has its own field in the credential model. It appears only in the holder details screen and is omitted by construction from the verifier payload. The verifier **UI** is a separate result panel, not a separate security principal or authenticated external application in this pass.

All data is fictional, held in React memory inside this page session. Navigation preserves issued credentials; a full refresh resets to samples. There is no localStorage, database, credential encryption, login, or secure wallet storage. The browser owner can inspect or alter in-memory data. Do not enter real personal information or rely on the result for access control.

No names, references, or credentials are sent to a verifier service or a blockchain. Local checks are **not ZK proofs**. The app does not connect a wallet, contact a Midnight node, generate proofs, issue signatures, or submit transactions. Network privacy against hosting infrastructure and traffic correlation is not addressed by this prototype.

Expiration is strict: `now < expiresAt`; equality is expired. Dates chosen by the issuer expire at **00:00 UTC at the start of that date**. The demo uses the browser clock, not trusted ledger time. The wallet status refreshes each second; verification evaluates a fresh clock value on submission and is explicitly a point-in-time result.

## Local setup

Requirements: Node.js 22+ (tested with 24.0.0) and pnpm 10.18.3.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:3000`. No environment secrets or configuration are required. `.env.example` documents the intentionally local-only mode; copying it is optional. If Corepack is unavailable, install the pinned pnpm version using your normal package-manager workflow.

```sh
corepack pnpm lint
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start
```

To use another development port: `corepack pnpm dev --port 3114`.

## Try the first-pass flow

1. Open `/wallet`: two sample credentials are active until 2030, and one Professional Certificate expired in 2025. Sample status follows real time, not a frozen demo clock.
2. Open `/issuer`, choose Student, enter a fictional holder name, and choose a future expiration date.
3. Click **Issue demo credential**, then **View credential**. The holder can see the private metadata.
4. Click **Use for verification**, then **Verify credential**. The default Student request returns VALID.
5. Change **Requested credential** to Employment and verify the Student credential again: INVALID.
6. Select no credential or the expired Professional Certificate: INVALID.
7. In `/wallet`, **Clear demo wallet** reveals the empty state; **Restore samples** brings the sample data back.

## Structure

One Next.js codebase, organized as layered modules—not a frontend/backend split:

```text
src/app/                    App Router pages, shell composition, recovery states
src/modules/credentials/    Credential model, cards, wallet/detail screens
src/modules/issuers/        Issuance validation and demo issuer screen
src/modules/verification/   Request/result contract and verification screen
src/adapters/midnight/      Isolated development proof adapter
src/store/                 In-memory wallet provider and fictional samples
src/shared/                Navigation, icons, UTC date presentation
contracts/                 Independent Compact prototype within this repository
tests/                     Node test runner + tsx domain and flow checks
```

The app uses Next.js 16.3.4, React 19.2.8, TypeScript 5.9.3, Tailwind CSS 4.3.3, ESLint, and pnpm. Styling is a compact graphite/lilac/lime wallet system with no remote font dependency.

## Midnight / Compact status

| Area | Status |
| --- | --- |
| Local credential model, issuance validation, validity checks | Implemented and tested |
| Minimal verifier payload and replaceable adapter contract | Implemented; development adapter only |
| Compact registration, existence/type/expiry concepts | Prototype; compiler 0.26.0 / language 0.18.0 `--skip-zk` check passed |
| Generated proving keys or circuit execution tests | Not done |
| Private commitments and holder-bound witnesses | Pending |
| Authenticated issuers and trusted timestamp validation | Pending |
| Real proof generation, wallet connection, testnet deployment | Pending |
| Production persistence, security review, external verifier | Pending |

See [contracts/README.md](contracts/README.md) for the exact compile command and important limitations. The Compact file stores only synthetic public registration data and accepts caller-supplied time; it is not a secure/private credential registry. Compiler success must not be mistaken for production validity.

The syntax was checked against the official [Compact language reference](https://docs.midnight.network/compact/reference/compact-reference) and [standard-library reference](https://docs.midnight.network/compact/standard-library/exports). The application follows [Next.js App Router installation guidance](https://nextjs.org/docs/app/getting-started/installation).

## Next milestones

1. Replace synthetic registration with authorized issuer commitments and holder-owned private witnesses; define trusted time and challenge binding.
2. Implement a real Midnight adapter and circuit execution tests, then test proof generation on a development network.
3. Add secure holder storage and an authenticated verifier boundary before real personal data enters the system.

Full revocation infrastructure, composite multi-credential proofs, identity networks, issuer governance, and advanced selective-disclosure policy remain out of scope for this first pass.
