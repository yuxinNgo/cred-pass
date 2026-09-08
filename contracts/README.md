# Compact foundation — prototype only

`credential-registry.compact` represents registration, type matching, existence, and strict expiration comparison. It is **not connected to the web app** and must not be deployed with real credentials.

Validated with Compact compiler **0.26.0**, language **0.18.0**, using `--skip-zk`. The installed compiler—not current-language assumptions—is the compatibility target. Reference syntax was checked against the official [Compact reference](https://docs.midnight.network/compact/reference/compact-reference) and [standard library](https://docs.midnight.network/compact/standard-library/exports).

```sh
compactc --skip-zk contracts/credential-registry.compact contracts/managed
```

This checks the compiler front end and emits generated artifacts; it does **not** generate proving keys, execute a proof, deploy a contract, or test a network transaction. Generated output is intentionally ignored.

## Intentional limitations

- Registration accepts any caller; issuer authentication and signatures are pending.
- Synthetic ID, type, and expiration are public ledger data. They are **not** private credentials, commitments, or encrypted values.
- `trustedNow` is only a conceptual argument. A caller can lie about it. An authenticated time source must replace it before any security claim.
- No holder ownership, replay resistance, verifier challenge binding, revocation registry, or selective-disclosure proof exists.
- Only types 0 (Student), 1 (Employment), and 2 (Professional) can be registered.
- Expiration uses unsigned integer timestamps supplied consistently by a future caller; the web domain uses UTC milliseconds. Integration must pin units explicitly.

The next contract iteration should replace this public shape with authenticated issuer commitments and private witnesses bound to a holder and verifier challenge. Keep private names/references out of ledger state. Do not build the final revocation or composite-proof architecture in this pass.
