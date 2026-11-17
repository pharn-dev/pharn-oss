---
spec_id: api-key-rotation
spec_content_hash: dab297febeed308c747082766576bbaef0f2497e0977c18c634ef2f4ceffa66a
applied_lessons: none
---

## Approach

Everything is built on the existing seams: a key route is a function over the document `doc` run inside
`store.transact()` (as `createKey` is), a state change calls `record()` from `src/audit.js`, and a cross-org id reads as
`404 not_found` through a lookup that takes the caller's `orgId`.

A key record gains two nullable fields, and nothing else about the record changes:

- `expiresAt` — set on the **old** key at rotation to `rotation time + 24 h` (`GRACE_MS`). Before that instant the key
  works and is _deprecated_; from that instant on it is dead (`key_expired`).
- `revokedAt` — set when an admin revokes the key; the key is dead (`key_revoked`) from then on.

A key is **dead** once it is revoked or its grace ended. Authentication decides that from the record and the clock
alone, **before** it looks at the secret, so a dead key needs no stored hash. Revoking therefore sets `hash` to `null`,
and a purge sets it to `null` on every key whose grace ended. That purge is what AC-7 asks for: the only thing this
process ever keeps of a secret is its SHA-256 on the key record (the token is returned once and never stored), and
after the grace period that hash is gone from the in-memory document and from the file.

A stored-record change goes through the store's migrations (Constraint 2): `SCHEMA_VERSION` becomes 3, with step `2` that
gives every existing key `expiresAt: null, revokedAt: null`. Authentication reads both fields as "absent means null",
because `test/helpers.js` pushes keys onto the document directly, without a migration.

Time comes in as a parameter, `now`, as it already does for `createKey` and `record`. `createApp(store, { now })` takes
a clock (default `() => new Date()`) so an integration test can place a request before or after the 24 hours without
patching `Date`.

Authentication order for a presented token: well-formed → key exists → `revokedAt` → `expiresAt` reached → hash matches →
success, with `deprecated: true` on the principal when `expiresAt` is set. The server adds `Deprecation: true` to every
response made for an authenticated, deprecated principal.

## Applied lessons

- none — the project has no `pharn/memory-bank/lessons-learned.md` yet (the lessons-index check returned `NO_CANON`), so
  there is no lesson to apply.

## Steps

1. **`src/store.js`** — `SCHEMA_VERSION = 3`. Add `MIGRATIONS[2]`: returns `{ ...doc, schemaVersion: 3, keys:
   doc.keys.map((k) => ({ ...k, expiresAt: k.expiresAt ?? null, revokedAt: k.revokedAt ?? null })) }`. `emptyDocument()`
   is unchanged apart from the constant.
2. **`src/auth.js`** — export `GRACE_MS = 24 * 60 * 60 * 1000`. Give `authenticate(doc, header, now = new Date())` the
   order above: `if (key.revokedAt) throw new AuthError(401, "key_revoked")`; `if (key.expiresAt && now >=
   new Date(key.expiresAt)) throw new AuthError(401, "key_expired")`; then the existing hash comparison, guarded so a
   key with no string `hash` is the ordinary `unauthenticated`. Return `{ keyId, orgId, role, deprecated: Boolean(key.expiresAt) }`.
   The `now >= expiresAt` boundary means exactly 24 hours is expired.
3. **`src/keys.js`** — add:
   - `findOrgKey(doc, orgId, id)` — the key with that id **and** that org, else `DomainError(404, "not_found")`.
   - `rotateKey(doc, principal, id, now = new Date())` — `requireAdmin` first (so a member gets `403 forbidden` whatever
     the id, AC-5), then `findOrgKey`. A key that is revoked or already rotated (`revokedAt` or `expiresAt` set) is
     `DomainError(409, "key_not_active")`. Otherwise mint `newKeyMaterial()`; push a new key with the old key's `orgId`,
     `role` and `label`, its own `hash`, `createdAt: now`, `expiresAt: null`, `revokedAt: null`; set the old key's
     `expiresAt = new Date(now.getTime() + GRACE_MS).toISOString()`; `record(doc, { orgId, actor: principal.keyId,
     action: "key.rotated", target: oldKey.id, details: { newKeyId: newKey.id } }, now)`; return `{ key:
     presentKey(newKey), token }`, the same shape `createKey` returns.
   - `revokeKey(doc, principal, id, now = new Date())` — `requireAdmin`, `findOrgKey`; if `revokedAt` is already set
     return without a second entry (nothing changed, so no audit entry); otherwise set `revokedAt = now.toISOString()`,
     `hash = null`, and `record(... action: "key.revoked", target: key.id)`. Revoking a rotated key during its grace
     period is allowed (SPEC Assumption 2).
   - `hasPurgeable(doc, now)` and `purgeExpired(doc, now)` — a key whose `expiresAt` is reached and whose `hash` is not
     `null` is purgeable; `purgeExpired` sets each such `hash` to `null` and returns the count. No audit entry: the
     rotation was already recorded and the purge is housekeeping.
4. **`src/server.js`** —
   - `send(res, status, payload, headers = {})` merges `headers`, and for `204` writes the status and headers and ends
     with **no body and no `content-type`**.
   - `createApp(store, { now = () => new Date() } = {})`; `let principal = null` moves above the `try`, so the `catch`
     path also sends `Deprecation: true` once a deprecated principal was authenticated. `authenticate(store.read(),
     header, now())`; handlers receive `now`.
   - Two routes, in `ROUTES` order after `GET /keys`: `["POST", /^\/keys\/([^/]+)\/rotate$/, …]` →
     `201` with `await store.transact((doc) => rotateKey(doc, principal, params[0], now()))`; `["DELETE",
     /^\/keys\/([^/]+)$/, …]` → `await store.transact((doc) => revokeKey(doc, principal, params[0], now()))`, then
     `204` with an empty payload. (`readJson` runs only for `POST`, which a rotate with no body already handles.)
   - In the `import.meta.main` block, after `load()`: run the purge once, then every `SWEEP_MS` (30 s) with an
     **unref'd** `setInterval`: `if (hasPurgeable(store.read(), now)) await store.transact((doc) => purgeExpired(doc, now))`,
     catching and logging an error so a failed write cannot crash the process. Not started inside `createApp`, so no
     test leaves a timer behind.
5. **`test/store.test.js`** — the existing version-1 test asserts `schemaVersion === 2`; change it to `SCHEMA_VERSION`
   (the README convention is a test that loads the previous version's file). Add a test that loads a version-2 file with
   an old-shape key and checks the key gains `expiresAt: null` and `revokedAt: null`, keeps its `hash`, and still
   authenticates through `authenticate` (Constraint 2).
6. **`README.md`** — add the two routes to the endpoints table, a short "Rotating and revoking keys" paragraph under
   Authentication (24-hour grace, `Deprecation: true`, `key_expired`, `key_revoked`), and the two new error codes.
7. Run `npm test` — the existing suites (`auth`, `invoices`, `money`, `store`) must still pass untouched apart from step 5.

## Files

- `src/store.js` — `SCHEMA_VERSION` 3 and migration step 2 (`expiresAt`, `revokedAt` on every key)
- `src/auth.js` — `GRACE_MS`; `authenticate` takes `now`, refuses revoked and expired keys, reports `deprecated`
- `src/keys.js` — `findOrgKey`, `rotateKey`, `revokeKey`, `hasPurgeable`, `purgeExpired`
- `src/server.js` — rotate and revoke routes, injectable clock, `Deprecation` header, bodiless `204`, the unref'd purge sweep
- `test/store.test.js` — the version assertion follows `SCHEMA_VERSION`; a version-2 → 3 migration test
- `README.md` — the two routes, the grace period and the new error codes

### Explicitly not touched

- `src/audit.js` — reused as is: `record()` already takes `details`
- `src/invoices.js` — `DomainError` is imported from it by `src/keys.js`, as today
- `src/money.js` — unrelated
- `test/helpers.js` — shared by the existing suites; left alone (see the first risk below)
- `package.json` — no new dependency, no script change (a test-script change would be a `spec_kind: test-infra` increment)

## Acceptance mapping

- **AC-1** → `rotateKey` returns `201 { key, token }` with a new `id` and the old key's `role` and `label`; the new key
  is an ordinary key whose token `authenticate` accepts on `GET /invoices`.
- **AC-2** → within `expiresAt` the old key authenticates with `deprecated: true`, and `handle` sends `Deprecation: true`.
- **AC-3** → from `expiresAt` on, `authenticate` throws `401 key_expired`, before any hash comparison.
- **AC-4** → `DELETE /keys/:id` → `revokeKey` → `204` with no body; a later request with that token is `401 key_revoked`.
- **AC-5** → `requireAdmin` runs first in `rotateKey`: a member gets `403 forbidden`.
- **AC-6** → `rotateKey` records `key.rotated`, `target` the old id, `details.newKeyId` the new id; `GET /audit` lists
  newest first, so it is the first entry.
- **AC-7** → `purgeExpired(doc, now)` nulls the old key's `hash` once `now >= expiresAt`; the document then holds neither
  the secret nor its hash, which the unit test asserts over `JSON.stringify(doc)`. The sweep in `server.js` is what
  calls it in a running server. Read the first risk for what this does and does not show.
- **Constraints** → hashes only (the new key stores `hashSecret(secret)`, as `createKey` does); migration step 2 plus the
  `?? null` reads keep every existing key authenticating; `findOrgKey` gives `404 not_found` on both new key routes
  for another org's id (an unknown id reads the same); no dependency is added.

## Risks & open questions

- **AC-7 is only partly checkable.** "No copy anywhere in the server process's memory" cannot be shown for a Node heap:
  strings are immutable, the garbage collector decides when `structuredClone` copies of an older document are freed,
  and no test can inspect them. The plan makes it true in the one sense the code controls — the old secret is never
  stored and its hash is nulled in the live document and in the file once grace ends — and the unit test asserts
  exactly that. Whether "a copy of the secret" was meant to include its SHA-256 is moot here, because the hash is
  purged either way. For the human: if a literal heap guarantee is wanted, it needs a different mechanism.
- **The purge is up to 30 s late.** Access stops exactly at `expiresAt` (authentication reads the clock); the stored hash
  is removed by the next sweep tick. An idle server still purges, because the sweep is a timer rather than a request.
  The sweep is wired in `import.meta.main` only, so the AC tests cover `purgeExpired` but not the timer.
- **`test/helpers.js` cannot serve AC-2 or AC-4 as it is.** Its `request()` returns only `{status, body}` (no headers,
  so no `Deprecation`) and calls `res.json()`, which throws on the empty `204` body. `/pharn-test` should build its
  requester in the test file (`createServer(createApp(store, { now }))`, `fetch`, `res.text()`), importing only
  `seededStore` from the helpers. Changing `helpers.js` is not planned, since the existing suites share it.
- **Behaviours the SPEC does not state, chosen here — please confirm or amend through `/pharn-spec`:** rotating a
  revoked or already-rotated key is `409 key_not_active`; revoking an already-revoked key is an idempotent `204` with
  no second audit entry; revoking a key purges its hash, so a revoked key answers `key_revoked` to anyone holding its
  id and any secret; the new audit action names are `key.rotated` (SPEC) and `key.revoked` (not in the SPEC), and
  `details` is `{ newKeyId }` (the SPEC says only "the new key's id in its details").
- **Dead keys are identified by id alone.** A caller who guesses a 12-hex id learns it was revoked or expired rather
  than getting `unauthenticated`. An id is not a secret (it is in every token) and is 48 random bits, so this is judged
  acceptable; flagged because it differs from today's "every failure is the same 401".
- **Rotation applies to the admin's own key too.** Nothing forbids an admin rotating or revoking the key it is using.
  That follows the SPEC as written; no guard is added.
- **`GET /keys` is unchanged:** it lists old, new and revoked keys alike and has no status field. A status field is
  not in the SPEC and is not added.
