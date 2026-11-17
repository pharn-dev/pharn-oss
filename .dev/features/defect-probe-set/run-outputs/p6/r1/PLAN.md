---
spec_id: api-key-rotation
spec_content_hash: dab297febeed308c747082766576bbaef0f2497e0977c18c634ef2f4ceffa66a
applied_lessons: none
---

> **ADVISORY.** This plan is model work. The floor guarantees only that it was derived from an Approved, un-drifted
> SPEC (`check-spec-approved.mjs`), that its lessons declaration is well-formed (`check-plan-lessons.mjs`), and that
> `## Files` parses as a writes-scope (`set-writes-scope.cjs --check --from-plan`). It does not show the plan is sound.

## Approach

The key lifecycle gets two new states on the existing key record: **rotated** (an `expiresAt` timestamp 24 h after
rotation) and **revoked** (a `revokedAt` timestamp). Both are new stored fields, so the store moves to schema
version 3 with a migration step (SPEC Constraint: versioned migrations).

- **Rotation** (`src/keys.js#rotateKey`) creates a successor key with the old key's `role` and `label`, through the
  same key-material and `hashSecret` path `createKey` uses (only the SHA-256 is kept). It sets the old key's
  `expiresAt = now + 24 h` and writes one `key.rotated` audit entry: target is the old id, `details.newKeyId` is the new
  id. It returns `{key, token}`, the same shape as `POST /keys`.
- **Revocation** (`src/keys.js#revokeKey`) sets `revokedAt = now` and writes a `key.revoked` audit entry.
- **Authentication** (`src/auth.js#authenticate`) takes a `now` argument. The hash comparison still comes first when
  the record has a hash, so a wrong secret stays the uniform `401 unauthenticated`. Then: `revokedAt` gives
  `401 key_revoked`; `expiresAt <= now` gives `401 key_expired`; `expiresAt > now` gives a principal marked
  `deprecated: true`.
- **Purge** (`src/keys.js#purgeExpiredKeys`) removes `hash` from every key whose `expiresAt` has passed. After the
  grace period the store document, both in memory and on disk, holds nothing derived from the old secret. A record with
  no hash and a past `expiresAt` still answers `401 key_expired`, judged by key id alone (see Risks).
- **Server** (`src/server.js`): two routes, `POST /keys/:id/rotate` (201) and `DELETE /keys/:id` (204, no body).
  `createApp(store, { now })` takes an optional clock (default `() => new Date()`) so the 24 h boundary can be tested.
  Every response to a deprecated principal carries `Deprecation: true`. Before authenticating, the app purges expired
  keys inside `store.transact` whenever one is due. The `import.meta.main` entry also runs an `unref`'d interval
  (60 s) that does the same, so purging does not wait for traffic.

Organization scope follows the README convention: a key is looked up by `(principal.orgId, id)`, so another
organization's key gives `404 not_found` on both new routes. The admin check runs first, so a member key gets
`403 forbidden` (AC-5), matching how `GET /keys` behaves today.

## Applied lessons

- none. The lessons index check returned `NO_CANON`: this project has no `pharn/memory-bank/lessons-learned.md` yet,
  so there were no lessons to apply.

## Steps

1. **Store, schema v3** (`src/store.js`): set `SCHEMA_VERSION = 3`. Add `MIGRATIONS[2]`, which maps every key to
   `{ ...k, expiresAt: k.expiresAt ?? null, revokedAt: k.revokedAt ?? null }` and sets `schemaVersion: 3`. Existing
   keys keep their `hash` untouched, so they keep authenticating (SPEC Constraint).
2. **Store test** (`test/store.test.js`): the v1 test asserts `schemaVersion === 2`, which breaks once the version is
   bumped. Change it to assert `SCHEMA_VERSION`, since v1 now migrates through to v3. Add a test that loads a v2 file
   containing a key, as the README convention requires: the key gains `expiresAt: null` and `revokedAt: null`, keeps
   its `hash`, and still authenticates.
3. **Auth** (`src/auth.js`): `authenticate(doc, header, now = new Date())` follows the order given in the Approach.
   Treat a missing field the same as `null`, because keys written by `createKey` before this change, and the test
   helper's seeded keys, have no such fields. The principal becomes `{keyId, orgId, role, deprecated}`.
4. **Keys** (`src/keys.js`):
   - Add `export const ROTATION_GRACE_MS = 24 * 60 * 60 * 1000`.
   - Add `rotateKey(doc, principal, id, now)`: `requireAdmin`, then find the key in the org (or `404 not_found`). A key
     that is already rotated or revoked gets `409 key_not_active` (proposed; see open questions). Otherwise create the
     successor, set the old key's `expiresAt`, record `key.rotated`, and return `{ key: presentKey(new), token }`. It
     records only `key.rotated`, with no separate `key.created`, so the newest audit entry is the rotation (AC-6).
   - Add `revokeKey(doc, principal, id, now)`: `requireAdmin`, then the org-scoped lookup (or `404`). Set `revokedAt`
     and record `key.revoked`. If the key is already revoked, return without a second audit entry (proposed; see open
     questions). Revoking an old key that is still in its grace period is allowed (SPEC Assumption).
   - Add `purgeExpiredKeys(doc, now)`: delete `hash` from every key with `expiresAt <= now` that still has one, and
     return how many it purged. Add `hasExpiredUnpurged(doc, now)` so the server can skip a `transact` when nothing is
     due.
   - Leave `presentKey` unchanged.
5. **Server** (`src/server.js`):
   - Change the signature to `createApp(store, { now = () => new Date() } = {})`.
   - Add the routes `["POST", /^\/keys\/([^/]+)\/rotate$/, …]`, returning 201 from
     `transact(doc => rotateKey(doc, principal, params[0], now()))`, and `["DELETE", /^\/keys\/([^/]+)$/, …]`,
     returning 204 from `transact(revokeKey…)`.
   - Have `send(res, status, payload, headers)` end with no body for 204.
   - Before `authenticate`, `await store.transact(doc => purgeExpiredKeys(doc, t))` when `hasExpiredUnpurged`.
   - Pass `t` to `authenticate`. Once the principal is `deprecated`, add `Deprecation: true` to every response,
     errors included.
   - In `import.meta.main`, add `setInterval(…, 60_000).unref()` for the same purge.
6. **README**: add the two endpoints to the table, and add the `Deprecation: true` header and the new error codes
   (`key_expired`, `key_revoked`, `key_not_active`) to the errors paragraph.
7. No new runtime dependencies: `node:crypto` and `node:http` only (SPEC Constraint).

## Files

- `src/store.js` — `SCHEMA_VERSION` 3, plus the `MIGRATIONS[2]` step that adds `expiresAt` / `revokedAt` to keys
- `src/auth.js` — `authenticate(doc, header, now)` gives `key_revoked` / `key_expired` / a `deprecated` principal
- `src/keys.js` — `ROTATION_GRACE_MS`, `rotateKey`, `revokeKey`, `purgeExpiredKeys`, `hasExpiredUnpurged`
- `src/server.js` — rotate/revoke routes, `createApp(store, { now })`, the `Deprecation` header, 204 send, purging
- `test/store.test.js` — the v1 test asserts the current version, plus a new v2→v3 migration test
- `README.md` — endpoint table and error codes for rotation and revocation

### Explicitly not touched

- `test/helpers.js` — reused as is. AC tests that need response headers, a 204 body or a clock build their own
  server/fetch.
- `src/audit.js` — reused as is (`record`, `listForOrg`).
- `src/invoices.js`, `src/money.js` — out of scope.
- `package.json` — no new dependency or script.
- `test/api-key-rotation.test.js`, `test/api-key-rotation.unit.test.js` — the AC tests, mapped in `AC-TESTS.md` and
  written by `/pharn-test`. Never in the build's scope.

## Acceptance mapping

- **AC-1** (rotate gives 201, new id, same role and label, working token): `rotateKey` plus the
  `POST /keys/:id/rotate` route. The new token goes through `createKey`'s material path, so it authenticates on
  `GET /invoices`.
- **AC-2** (old token within 24 h succeeds with `Deprecation: true`): `authenticate` gives a `deprecated` principal
  while `expiresAt > now`, and the server sets the header.
- **AC-3** (old token after 24 h gives `401 key_expired`): `authenticate` checks `expiresAt <= now`. The integration
  test advances the clock it injects through `createApp(store, { now })`.
- **AC-4** (`DELETE /keys/:id` gives 204, then the token gets `401 key_revoked`): `revokeKey` plus the DELETE route
  plus the `revokedAt` check in `authenticate`.
- **AC-5** (member rotate gives `403 forbidden`): `requireAdmin` runs first in `rotateKey`.
- **AC-6** (newest audit entry is `key.rotated`, target the old id, `details.newKeyId` the new id): the single
  `record` call in `rotateKey`.
- **AC-7** (after the grace period, no copy of the old secret in server memory): `purgeExpiredKeys` drops the only
  secret-derived value the process holds (the hash) from the store document. The secret itself is never stored. See
  the first risk for what a unit test can and cannot show.

## Risks & open questions

- **AC-7 cannot be proven as worded. A human should decide.** "No copy … anywhere in the server process's memory"
  covers the V8 heap: request-header strings and the previous store document that `transact` replaced are freed only
  when garbage collection runs, which no test can force or observe. The plan narrows AC-7 to what a unit test can
  check: after `purgeExpiredKeys`, the serialized store document contains neither the old secret nor its SHA-256. If
  that narrowing is not acceptable, the criterion needs re-specifying via `/pharn-spec`. Grill should look at this.
- **Expired records answer by key id.** A purged record has no hash to check, so any token carrying its 12-hex id gets
  `key_expired` rather than `unauthenticated`. Key ids already appear in `GET /keys` and the audit log, so little is
  revealed, but it does tell an outsider that the id once existed. Revoked keys keep their hash, so `key_revoked` is
  only ever told to a holder of the correct secret.
- **Purge timing.** The hash goes at the first request after expiry, or within about 60 s through the interval. It is
  not removed at the exact millisecond.
- **Proposed behaviour the SPEC does not state:**
  - rotating a key that is already rotated or revoked gives `409 key_not_active`
  - revoking a key that is already revoked gives 204 with no second audit entry
  - an admin may revoke the very key it is calling with
  - `GET /keys` does not show rotation or revocation state, because `presentKey` is unchanged

  Confirm or change any of these at grill.
- **An existing test changes.** `test/store.test.js` hard-codes schema version 2, so this build must edit it. Expect
  `/pharn-regress` to see that file change. The change is the version assertion plus one added migration test.
- **Test helper limits.** `test/helpers.js#startApp` throws away response headers, calls `res.json()` (which fails on
  an empty 204 body) and passes no clock. The AC tests for AC-2, AC-3 and AC-4 need their own `createServer(createApp(store, { now }))`
  and a `fetch` that reads the headers.
