---
spec_id: api-key-rotation # carried from the Approved SPEC — the §6 root identity
spec_content_hash: dab297febeed308c747082766576bbaef0f2497e0977c18c634ef2f4ceffa66a # carried forward; the next stage re-verifies spec↔plan
applied_lessons: none
---

> ADVISORY: this plan is model work. Only the SPEC gate, the lessons declaration and the `## Files` / AC-TESTS checks
> are floor-verified.

## Approach

Rotation and revocation become **states on the existing key record**, decided in one place at authentication time, so
every route (not only `/invoices`) honours them.

- **Key record gains two fields** (a stored-shape change, so schema v2 → v3 through `MIGRATIONS`): `status`
  (`active` | `rotated` | `expired` | `revoked`) and `expiresAt` (ISO string, set only on a `rotated` key = rotation
  time + 24 h, else `null`). A record with no `status` reads as `active`: the migration writes it for every existing
  key, and `test/helpers.js` still builds status-less keys.
- **`rotateKey`** (admin only; the key must be in the caller's org, else `404 not_found`; it must be `active`, else
  `409 key_not_active`): creates a new `active` key with the old key's role and label, flips the old key to `rotated`
  with `expiresAt = now + 24 h`, and audits `key.rotated` (target = old key id, `details: { newKeyId }`). Returns `201`
  `{key, token}` in the same shape `POST /keys` already returns.
- **`revokeKey`** (admin only, org-scoped, `404` otherwise): sets `status: "revoked"`, **drops `hash`**, audits
  `key.revoked` (target = key id), returns `204` with no body. Revoking an already revoked key is an idempotent `204`
  with no second audit entry. A `rotated` key can be revoked (SPEC assumption).
- **`authenticate(doc, header, now = new Date())`** looks the key up by id, then: `revoked` → `401 key_revoked`;
  `expired`, or `rotated` with `expiresAt <= now` → `401 key_expired`; otherwise it verifies the secret's hash exactly as
  today. A key in grace authenticates and the principal carries `deprecated: true`; the server sets
  `Deprecation: true` on **every** response to that request (success or error). `keyState(key, now)` in `auth.js` is the
  one function that turns a record into its effective state.
- **AC-7 — no copy of the old secret.** Only `sha256(secret)` is ever stored, so the "copy" that can outlive the request
  is the old key's **hash**. `purgeExpiredKeys(doc, now)` deletes `hash` from every `rotated` key past `expiresAt` and
  sets `status: "expired"`; `Store.transact` already replaces `this.doc` with a fresh clone, so the purged document is
  the only one the process keeps. The server runs the purge (a) at the start of every request, only when
  `keysDue(doc, now)` says something is due (so no write per request), and (b) from an `unref`'d once-a-minute interval
  started in the `import.meta.main` block, so an idle server also drops it. The unit test (AC-7) asserts on the document;
  see the risks for what cannot be asserted.
- **Clock seam.** `createApp(store, { now } = {})`, `now` defaulting to `() => new Date()`; the handler reads it once
  per request and passes that instant to authenticate, the purge and the route handlers (which already take `now` in
  `createKey`/`payInvoice`). This lets the integration tests cross the 24 h boundary without waiting or editing stored
  fields.
- **Server plumbing.** Two routes: `POST /keys/:id/rotate` and `DELETE /keys/:id`. `send` learns `204` (head with no
  body). `presentKey` adds `status` and `expiresAt`, still never `hash`.
- **Migration.** `SCHEMA_VERSION = 3`; `MIGRATIONS[2]` sets `status: "active"` and `expiresAt: null` on each key, the
  record's own values winning. The README convention asks for a test that loads the previous version: `test/store.test.js`
  gets one, and its existing v1 test asserted the literal `2` — that line must follow `SCHEMA_VERSION`.

## Applied lessons

- none — the project has no `pharn/memory-bank/lessons-learned.md` (verdict `NO_CANON`), so there is nothing to read or
  cite.

## Steps

1. `src/store.js`: bump `SCHEMA_VERSION` to 3, add `MIGRATIONS[2]` (keys gain `status: "active"`, `expiresAt: null`).
2. `src/auth.js`: add `keyState(key, now)`; extend `authenticate` with `now`, the `key_revoked` / `key_expired` 401s
   and `deprecated` on the principal. Wrong-secret, unknown-id and malformed tokens stay the one `unauthenticated` 401
   (the `hash` comparison only runs for a key that still has one).
3. `src/keys.js`: new keys get `status: "active"`, `expiresAt: null`; add `findKey(doc, orgId, id)` (`404 not_found`),
   `rotateKey`, `revokeKey`, `keysDue`, `purgeExpiredKeys`; extend `presentKey`.
4. `src/server.js`: `createApp(store, { now })`; purge-before-authenticate; `Deprecation` header; `204` in `send`; the two
   routes (`DELETE` has no body parse — `readJson` is POST-only today); the minute interval in the `main` block.
5. `test/store.test.js`: change the v1 test's `2` to `SCHEMA_VERSION`; add a v2-file test (keys gain `active`, and an
   old key's token still authenticates after load).
6. `README.md`: two endpoint rows, the error codes `key_expired` / `key_revoked` / `key_not_active`, and a short
   "Rotating a key" paragraph under Authentication.
7. AC tests are **not** a build step: `/pharn-test` writes them from `AC-TESTS.md` before the build.

## Files

- `src/store.js` — schema v3 and the v2→v3 migration
- `src/auth.js` — `keyState`, time-aware `authenticate`, `key_expired` / `key_revoked`, `deprecated` flag
- `src/keys.js` — `rotateKey`, `revokeKey`, `findKey`, `keysDue`, `purgeExpiredKeys`, `presentKey` additions
- `src/server.js` — the two routes, clock seam, expiry purge, `Deprecation` header, `204` responses
- `test/store.test.js` — v1 test follows `SCHEMA_VERSION`; new v2→v3 migration test
- `README.md` — document the new endpoints, errors and rotation behaviour

### Explicitly not touched

- `src/invoices.js` — `DomainError` is reused as is
- `src/audit.js` — `record()` is reused as is
- `src/money.js` — unrelated
- `test/helpers.js` — reused; it builds status-less keys, which `keyState` reads as `active`
- `test/auth.test.js` — existing behaviour is unchanged and must keep passing as is
- `package.json` — no scripts and no dependencies change

## Acceptance mapping

- AC-1 → `rotateKey` + `POST /keys/:id/rotate`: `201 {key, token}`, role and label copied, the new key is `active` so its
  token authenticates `GET /invoices`.
- AC-2 → a `rotated` key before `expiresAt` authenticates with `deprecated: true`; the server sets `Deprecation: true`.
- AC-3 → a `rotated` key at or after `expiresAt` (or `expired`) → `401 key_expired`, using the injected clock.
- AC-4 → `DELETE /keys/:id` → `revokeKey`, `204`; afterwards the key's token → `401 key_revoked`.
- AC-5 → `rotateKey` calls `requireAdmin` first → `403 forbidden` for a member key.
- AC-6 → `rotateKey` records `key.rotated` (target old id, `details.newKeyId`); `GET /audit` returns newest first.
- AC-7 → `purgeExpiredKeys` deletes the old key's `hash` at grace end (unit-tested on the document); the server calls it
  per request when due and on a one-minute timer.
- Constraint "secrets never plaintext" → the new token is built once in `newKeyMaterial` and only its hash is stored.
- Constraint "existing data and keys keep working" → migration step plus the `status ?? "active"` reading, with a test
  that loads a v2 file.
- Constraint "other org reads `404 not_found`" → `findKey` filters by `principal.orgId`, as `findInvoice` does.
- Constraint "no new runtime dependencies" → only `node:` built-ins, none new.

## Risks & open questions

- **AC-7 is only partly verifiable in Node.** JS strings cannot be zeroed and the garbage collector may leave copies of
  a request's token strings until collection, so "nowhere in process memory" cannot be proved. What the plan guarantees
  and tests is that the secret is never stored and the stored hash is deleted from the live document. Between grace end
  and the next purge (the next request, or at most one minute) the hash is still present, though `authenticate` already
  refuses it. For the human and `/pharn-grill`: is that the intended reading of AC-7?
- **`key_expired` / `key_revoked` are keyed on the key id alone.** Once the hash is gone, any secret presented with that
  id gets the specific code, not `unauthenticated`. The only leak is "this id was rotated or revoked", and ids are shown
  to admins only. Keeping the hash to avoid it would contradict AC-7.
- **Decisions the SPEC does not make** (flag for grill): rotating a key that is not `active` → `409 key_not_active`;
  revoking an already revoked key → idempotent `204`; no `key.expired` audit entry for the purge (the README convention
  says every state change is audited, the SPEC lists only rotation and revocation); revoking your own key, including
  the last admin key, is allowed.
- **Test helper limit:** `test/helpers.js` `request()` always calls `res.json()`, which fails on an empty `204`. The
  AC-4 test needs its own fetch for the revoke call. `startApp` takes no clock, so the integration tests build their
  server with `createApp(store, { now })`.
- **`test/store.test.js` is an existing test edited by the build.** The version bump breaks its literal `2`, so editing
  it is unavoidable; if `/pharn-regress` treats edited existing tests as a regression, this is the cause.
