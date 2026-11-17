---
spec_id: api-key-rotation
spec_content_hash: dab297febeed308c747082766576bbaef0f2497e0977c18c634ef2f4ceffa66a
applied_lessons: none
---

## Approach

Plan from the Approved SPEC (ARCHITECTURE.md §6); everything below is advisory.

Give each stored key record a lifecycle: `status` is `active`, `rotated` (old key inside its 24-hour grace) or `revoked`,
and `expiresAt` marks the end of a rotated key's grace. The record shape changes, so `SCHEMA_VERSION` goes 2 → 3 with a
`MIGRATIONS[2]` step that gives every existing key `status: "active"` and `expiresAt: null`. That keeps old files loading
and every existing key authenticating (Constraint 2).

- **Rotate** (`POST /keys/:id/rotate`, admin): inside one `store.transact`, create a new key with the same `orgId`, `role`
  and `label`, mark the old key `rotated` with `expiresAt = now + 24h`, and write one `key.rotated` audit entry (target =
  old id, details `{ newKeyId }`). No `key.created` entry is written, so `key.rotated` stays the newest entry (AC-6). The
  response mirrors `POST /keys`: `201 { key, token }`.
- **Revoke** (`DELETE /keys/:id`, admin): mark the key `revoked`, clear its `hash`, write `key.revoked`, answer `204`. This
  also works on a rotated key inside its grace (Assumption 2).
- **Authenticate** takes an injectable `now`. After the id lookup, and before any hash comparison, a `revoked` key is
  `401 key_revoked`, and a `rotated` key with `now >= expiresAt` is `401 key_expired`. A rotated key inside its grace
  verifies as normal and yields a principal with `deprecated: true`. Dead keys never reach hash verification, which is
  why their `hash` can be cleared.
- **Deprecation header**: `server.js` sends `Deprecation: true` on every response to a request whose principal is
  `deprecated` (AC-2).
- **AC-7 (no copy of the old secret)**: the plaintext secret is never stored, only `sha256(secret)`. So "no copy" is made
  testable as: once a rotated key's grace ends, its `hash` (the only derivative) is cleared from the in-memory document
  and, because the sweep runs through `store.transact`, from the file. `sweepExpiredKeys(doc, now)` does that for every
  rotated key with `expiresAt <= now`. Correctness never depends on the sweep, because `authenticate` checks the clock
  itself. The sweep runs from an unref'd interval in the `import.meta.main` block of `server.js`, once at startup and
  then every 60 s. It skips `transact` when nothing is due, so an idle server does not rewrite the file. The hash can
  therefore outlive the grace by up to one interval. See the risks.
- **Clock injection**: `createApp(store, { now })`, defaulting to `() => new Date()`, hands `now()` to authentication and
  to the key handlers. This lets AC-3 be tested without waiting 24 hours. `test/helpers.js`'s `startApp(store, opts)`
  forwards it.
- **Cross-org and bad targets**: a key id outside the caller's org, or unknown, is `404 not_found` on rotate and revoke
  (Constraint 3). Admin is checked before lookup, so a member gets `403 forbidden` (AC-5).

## Applied lessons

- none — the project has no `pharn/memory-bank/lessons-learned.md` yet (`check-lessons-index.mjs` returned `NO_CANON`), so there is nothing to apply.

## Steps

- `src/store.js`: set `SCHEMA_VERSION = 3`. Add `MIGRATIONS[2]` mapping each key to `{ status: "active", expiresAt: null, ...key }`.
- `src/auth.js`: change `authenticate(doc, header, now = new Date())` to apply the dead-key checks above before hash
  verification, and return `{ keyId, orgId, role, deprecated }`. Treat a missing `status` as active, since helper-seeded
  records in tests predate the migration. Only an explicit `revoked` or `rotated` takes a branch.
- `src/keys.js`:
  - `createKey` also stores `status: "active"` and `expiresAt: null`.
  - Add a shared `GRACE_MS = 24 * 60 * 60 * 1000`.
  - Add `rotateKey(doc, principal, keyId, now = new Date()) -> { key, token }`: `requireAdmin`; look the key up by `id`
    and `orgId`, else `DomainError(404, "not_found")`; if its status is not `active`, `DomainError(409, "key_not_active")`.
  - Add `revokeKey(doc, principal, keyId, now = new Date())`: the same lookup. A key already `revoked` is a no-op, with no
    second audit entry. Otherwise it sets `status: "revoked"`, `hash: null`, `expiresAt: null` and records `key.revoked`.
  - Add `sweepExpiredKeys(doc, now = new Date()) -> number`: clears `hash` on every `rotated` key with
    `expiresAt <= now` that still has one, and returns the count.
  - `presentKey` adds `status` and `expiresAt` (never `hash`).
- `src/server.js`:
  - Add routes `POST /^\/keys\/([^/]+)\/rotate$/` (201) and `DELETE /^\/keys\/([^/]+)$/` (204).
  - `send()` accepts extra headers and writes no body for 204.
  - `createApp(store, { now })` passes `now` to `authenticate` and the handlers, and sets the `Deprecation` header.
  - Add an exported `startKeySweeper(store, { intervalMs = 60_000, now })` that skips `transact` when no key is due. The
    `import.meta.main` block starts it.
- `test/helpers.js`: `request` tolerates an empty body (204) by returning `body: null`. `startApp(store, opts)` forwards
  `opts` to `createApp`.
- `test/store.test.js`: the v1 migration test now expects `SCHEMA_VERSION` (3). Add a test that loads a v2 file and checks
  its keys gain `status: "active"` and still authenticate.
- `test/keys-edge.test.js` (new, build-owned): cross-org rotate and revoke are `404 not_found`; rotating a rotated or
  revoked key is `409 key_not_active`; revoke during grace gives `key_revoked`; revoke is idempotent; the listing shows
  `status` and never a hash; `startKeySweeper` clears due hashes and does not rewrite the file when none are due.
- `README.md`: add the two endpoints, the `Deprecation` header, the new error codes (`key_expired`, `key_revoked`,
  `409 key_not_active`) and one line on the key lifecycle.
- AC tests are mapped in `AC-TESTS.md` (Step 4c), not here.

## Files

- `src/store.js` — `SCHEMA_VERSION` 3 and the v2→v3 key migration
- `src/auth.js` — dead-key checks, clock parameter and `deprecated` flag in `authenticate`
- `src/keys.js` — `rotateKey`, `revokeKey`, `sweepExpiredKeys`, lifecycle fields on `createKey` and `presentKey`
- `src/server.js` — rotate and revoke routes, clock injection, `Deprecation` header, 204 handling, `startKeySweeper`
- `test/helpers.js` — empty-body tolerant `request`, `startApp(store, opts)` forwards the clock
- `test/store.test.js` — updated version assertion plus a v2→v3 migration test
- `test/keys-edge.test.js` — non-AC coverage of the constraints and edge cases
- `README.md` — endpoint table, error codes and key lifecycle

### Explicitly not touched

- `src/invoices.js` — `DomainError` is reused as is
- `src/audit.js` — `record` is reused as is; the new actions are plain strings
- `src/money.js` — unrelated
- `package.json` — no dependency and no script change
- `pharn.config.json` — project configuration, out of scope

## Acceptance mapping

- AC-1 → `rotateKey` and the `POST /keys/:id/rotate` route return `201 { key, token }` with a new id and the old key's `role` and `label`. The new key is `active`, so its token authenticates `GET /invoices`.
- AC-2 → inside the grace, `authenticate` accepts the old token and flags `deprecated`. `server.js` adds `Deprecation: true`.
- AC-3 → once `now >= expiresAt`, `authenticate` throws `AuthError(401, "key_expired")`. The injected clock makes this testable.
- AC-4 → `DELETE /keys/:id` runs `revokeKey` and returns 204. A later use of the token gives `AuthError(401, "key_revoked")`.
- AC-5 → `rotateKey` calls `requireAdmin` first, so a member gets `403 forbidden`.
- AC-6 → the only audit entry written by a rotation is `key.rotated`, with target = old id and `details.newKeyId` = new id. `GET /audit` lists newest first.
- AC-7 → `sweepExpiredKeys` clears the old key's `hash` once the grace ends. The sweeper runs it through `transact`, so memory and disk are both cleared. Revocation clears it immediately.
- Constraint: secrets stay hashed → the new key reuses `newKeyMaterial` and `hashSecret`, and no plaintext is stored.
- Constraint: existing data keeps loading → `MIGRATIONS[2]` plus the test in `test/store.test.js`.
- Constraint: other org is `404 not_found` → lookups in `rotateKey` and `revokeKey` are scoped by `principal.orgId`.
- Constraint: no new runtime dependencies → only `node:` built-ins are used.

## Risks & open questions

- **AC-7 cannot be proven literally.** JavaScript strings are immutable and the garbage collector decides when memory is
  reclaimed. The plaintext secret never persists anywhere (it exists only transiently while a request is handled). The
  plan therefore interprets "no copy of the secret" as "no stored derivative: the `hash` is cleared in the in-memory
  document and in the file". The unit test can check only that. It cannot inspect process memory, and the cloned
  document from `structuredClone` stays reachable until it is collected. **For `/pharn-grill`: confirm this reading.**
- The hash survives up to one sweep interval (60 s) past the grace end if no request arrives in between. A per-rotation
  timer would be tighter, but it would not survive a restart.
- Behaviours the SPEC does not state, chosen here for the human to confirm:
  - rotating a key that is not `active` gives `409 key_not_active`;
  - revoking an already revoked key is an idempotent `204` with no new audit entry;
  - dead keys answer `key_revoked` or `key_expired` on the id alone, without verifying the secret. That reveals that a
    given key id exists and is dead, and ids already appear in the `GET /keys` listing;
  - the rotation response shape mirrors `POST /keys` (`{ key, token }`), and the audit detail key is `newKeyId`.
- The `schemaVersion` bump changes an assertion in the existing `test/store.test.js` (2 → 3). That is a deliberate
  update of an existing test, not a regression.
- `test/helpers.js` must tolerate a `204` empty body before the AC-4 test can use `app.request("DELETE", …)`. The
  `/pharn-test` stage runs before the build, so its AC-4 test may fail first on the helper's JSON parse rather than on the
  missing route. That is still a failing test, and it passes after the build.
- Revoking a key clears its `hash`. A revoked key can therefore never be reactivated, which matches "revoke immediately".
