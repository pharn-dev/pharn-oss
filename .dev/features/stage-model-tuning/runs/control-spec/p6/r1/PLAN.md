---
spec_id: api-key-rotation
spec_content_hash: dab297febeed308c747082766576bbaef0f2497e0977c18c634ef2f4ceffa66a
applied_lessons: none
---

## Approach

ADVISORY: this is model work. The floor checks only this file's frontmatter, its `## Files` shape and the AC mapping.

The key record gets two lifecycle fields, `expiresAt` (ISO string or `null`) and `revokedAt` (ISO string or `null`),
added through a store migration from schema version 2 to 3, so existing files still load and existing keys still
authenticate (both fields start as `null`). Rotation creates a successor key with the same `orgId`, `role` and `label`
and sets the old key's `expiresAt` to rotation time + 24 h. Revocation sets `revokedAt`. `authenticate` takes `now`
and, only **after** the secret has matched, refuses a revoked key with `401 key_revoked` and an expired key with
`401 key_expired`. Inside the grace window it marks the principal `deprecated`, and the server turns that into the
`Deprecation: true` response header. Secrets stay hashed (SHA-256, as today). A purge step clears the stored hash
of every key whose grace period has ended (AC-7, see Risks).

The clock is read per request with `new Date()`, never cached at startup. The integration tests for AC-2/AC-3 can then
move time with `node:test`'s `mock.timers` (the `Date` API only) and still drive the real HTTP routes.

## Applied lessons

- none: the project has no memory-bank yet (`check-lessons-index.mjs --verdict` printed `NO_CANON`), so there was
  no lesson to read or apply.

## Steps

1. **Store migration (`src/store.js`).** Set `SCHEMA_VERSION = 3`. Add `MIGRATIONS[2]`, which maps every key to
   `{ ...k, expiresAt: k.expiresAt ?? null, revokedAt: k.revokedAt ?? null }` and sets `schemaVersion: 3`. Leave
   `emptyDocument()`'s shape unchanged apart from the version.
2. **Authentication (`src/auth.js`).**
   - Change the signature to `authenticate(doc, header, now = new Date())`, which stays compatible with existing
     callers.
   - Malformed, unknown and wrong-secret tokens stay the same `401 unauthenticated`, as today.
   - Once the secret matches:
     - `revokedAt` set → `AuthError(401, "key_revoked")`;
     - `expiresAt` set and `<= now` → `AuthError(401, "key_expired")`;
     - `expiresAt` set and `> now` → the principal gains `deprecated: true`.
   - A key whose `hash` was purged (null) and whose `expiresAt <= now` → `401 key_expired`, judged on the key id
     alone (see Risks).
   - Update the header comment, which says "every failure is the same 401".
3. **Key operations (`src/keys.js`).**
   - `findOrgKey(doc, orgId, id)` returns the caller's key or throws `DomainError(404, "not_found")`. Another
     organization's key is indistinguishable from a missing one (SPEC Constraint), following `findInvoice`'s pattern.
   - `createKey` writes `expiresAt: null` and `revokedAt: null` on new records.
   - `rotateKey(doc, principal, id, now = new Date())`:
     - check `requireAdmin` first, then `findOrgKey`;
     - refuse a key that is already revoked or already rotated with `409 key_not_active` (open question below);
     - create the successor with the same `role` and `label`, `expiresAt: null` and `revokedAt: null`;
     - set the old key's `expiresAt` to `now + 24h`;
     - write one audit entry, `{ action: "key.rotated", target: oldId, details: { newKeyId } }`, and no separate
       `key.created`, so AC-6's "newest entry" holds;
     - return `{ key: presentKey(newKey), token }`, the same shape `POST /keys` returns.
   - `revokeKey(doc, principal, id, now = new Date())`:
     - check `requireAdmin`, then `findOrgKey`;
     - set `revokedAt` (an already-revoked key keeps its first `revokedAt`, idempotent);
     - write the audit entry `{ action: "key.revoked", target: id }`. Revoking a rotated key during its grace period
       is allowed (SPEC Assumption).
   - `purgeExpiredKeys(doc, now = new Date()) → number` sets `hash` to `null` on every key whose
     `expiresAt <= now`, and returns how many it changed.
   - `GRACE_MS = 24 * 60 * 60 * 1000` is a module constant. The SPEC fixes the grace period at 24 h, so it is not
     configurable.
4. **HTTP (`src/server.js`).**
   - Add the route `POST /^\/keys\/([^/]+)\/rotate$/` → `201` with the rotation result, through `store.transact`.
   - Add the route `DELETE /^\/keys\/([^/]+)$/` → `204` with no body, through `store.transact`.
   - `send(res, status, payload, headers)`:
     - writes no body (and no content-type) for `204`;
     - merges extra headers.
   - `handle` computes `const now = new Date()` once per request and passes it to `authenticate`. When
     `principal.deprecated` is set, it adds `Deprecation: true` to that response, whether the response succeeds or
     fails.
   - In the `import.meta.main` block:
     - run `purgeExpiredKeys` through `store.transact` once at start-up;
     - run it again on an `unref()`'d interval, every 60 s;
     - skip the transaction when nothing has expired, so idle ticks do not rewrite the file.
5. **Existing tests (`test/store.test.js`).**
   - The v1-migration test asserts `schemaVersion === 2` and will fail at version 3. Change it to `SCHEMA_VERSION`.
   - Add a test that loads a **version-2** file with a key and checks that it migrates to 3 with
     `expiresAt`/`revokedAt` set to `null`, its `hash` unchanged, and that the key still authenticates (README
     convention: a migration gets a test that loads a file at the previous version).
6. **Docs (`README.md`).** Add the two routes to the Endpoints table. Add `401 key_expired`, `401 key_revoked` and
   `409 key_not_active` to the error list, and a short note on the 24 h grace period and the `Deprecation: true`
   header.

## Files

- `src/store.js` — SCHEMA_VERSION 3 and the 2→3 migration adding `expiresAt`/`revokedAt` to keys
- `src/auth.js` — `authenticate(doc, header, now)` with `key_revoked` / `key_expired` / `deprecated`
- `src/keys.js` — `findOrgKey`, `rotateKey`, `revokeKey`, `purgeExpiredKeys`, `GRACE_MS`; `createKey` writes the new fields
- `src/server.js` — rotate and revoke routes, the `Deprecation` header, the 204 response with no body, the purge at start-up and on an interval
- `test/store.test.js` — the v1 test asserts the current version; a new v2→v3 migration test
- `README.md` — endpoints, error codes, grace period and Deprecation header

### Explicitly not touched

- `src/audit.js` — reused as is (`record`, `listForOrg`)
- `src/invoices.js` — reused for `DomainError` only
- `test/helpers.js` — not changed; the AC tests, written before the build, must not depend on a helper change
- `package.json` — no new runtime dependencies (SPEC Constraint) and no test-script change (test infrastructure)

## Acceptance mapping

- **AC-1** (rotate → 201, new id, same role and label, working token) → `rotateKey` and the `POST /keys/:id/rotate`
  route. The new token authenticates through the unchanged hash path.
- **AC-2** (old token in the grace window → success plus `Deprecation: true`) → `authenticate` sets `deprecated`
  while `expiresAt > now`, and `handle` sets the header.
- **AC-3** (old token after 24 h → `401 key_expired`) → `authenticate`'s expiry branch, with `now` read per request.
- **AC-4** (`DELETE /keys/:id` → 204, then the token → `401 key_revoked`) → `revokeKey`, the DELETE route, the
  no-body 204 in `send`, and `authenticate`'s revoked branch.
- **AC-5** (member rotates → `403 forbidden`) → `requireAdmin` runs before any lookup in `rotateKey`.
- **AC-6** (`GET /audit` newest entry is `key.rotated`, the old id as target, the new id in details) → `rotateKey`'s
  single audit entry with `details.newKeyId`.
- **AC-7** (no copy of the old secret in memory after the grace period) → `purgeExpiredKeys` removes the only
  secret-derived value the process keeps, the stored hash. This reading is narrower than the AC's text; see Risks.

## Risks & open questions

- **AC-7 cannot be tested as written: needs a human decision.** The process never stores the secret, only its
  SHA-256 (SPEC Constraint). The literal claim "no copy … anywhere in the server process's memory" covers request
  buffers and header strings that JavaScript cannot erase on demand, and a test that has to hold the token to
  exercise it cannot prove the claim either. This plan maps AC-7 to the testable reading: after the grace period the
  store document holds no hash of the old secret (`purgeExpiredKeys`). If that reading is not the intent, AC-7 should
  be re-specified via `/pharn-spec` (for example: "the old key's stored hash is removed"). `/pharn-grill` should raise
  it.
- **Purge timing.** The interval clears the hash within about 60 s of expiry, not at the exact instant, and `createApp`
  alone (as in the tests) runs no interval. After a purge, `key_expired` is answered on the key id alone, so anyone who
  knows an expired key's 12-hex id learns that it was rotated. Before the purge, the secret must match first.
- **Not in the SPEC, so chosen here and flagged:**
  - rotating a revoked or already-rotated key → `409 key_not_active`;
  - re-revoking is idempotent (204);
  - `GET /keys` is unchanged (no status fields);
  - an admin may revoke its own key, or the organization's last admin key, which locks the organization out.
- **403 or 404.** A member calling a key route gets `403 forbidden` before any lookup, even for another
  organization's key id (the existing `voidInvoice` order). The SPEC Constraint "404 on every key route" is then read
  as applying to admin callers.
- **`Deprecation: true`** follows the SPEC literally. RFC 9745 defines `Deprecation` as a structured date
  (`@<epoch>`), so strict clients may not parse `true`.
- **The test runner may block `/pharn-test`.** The `test` script is `node --test "test/*.test.js"` with no per-test
  results reporter. If `/pharn-test`'s preflight reports `blocked: no-test-runner`, that needs a separate
  `spec_kind: test-infra` increment first. It is deliberately not in this plan.
- **Mocking the clock.** AC-2/AC-3 depend on `mock.timers.enable({ apis: ["Date"] })` working alongside `fetch` and
  `node:http` on Node 24. If it does not, the fallback is to seed a key record with `expiresAt` already in the past
  through `store.transact`, which ties the test to the field name `expiresAt`.
