---
spec_id: api-key-rotation
spec_content_hash: dab297febeed308c747082766576bbaef0f2497e0977c18c634ef2f4ceffa66a
applied_lessons: none
---

> ADVISORY — model-written implementation plan. The floor checks only its frontmatter (spec pin carried forward,
> `applied_lessons` shape) and the parseability of `## Files`; nothing here is a guarantee that the plan is sound.

## Approach

Rotation and revocation become **states of a key record** rather than new record types. A key gains two stored
fields, `expiresAt` (ISO string or `null`) and `revokedAt` (ISO string or `null`). Rotation creates a fresh key with
the old key's `orgId`, `role` and `label`, and sets the old key's `expiresAt` to rotation time + 24 h. Revocation sets
`revokedAt`. `authenticate()` keeps its current rule that every *unverified* token is the same `401 unauthenticated`;
only **after** the secret's hash matches does it look at state, so `key_revoked`, `key_expired` and the deprecation
flag are only ever told to a caller that holds the real secret (no key-id enumeration through the new error codes).

Precedence after a hash match: `revokedAt` set → `401 key_revoked`; else `expiresAt` set and `now >= expiresAt` →
`401 key_expired`; else `expiresAt` set (inside the grace window) → authenticate, with `principal.deprecated = true`;
else authenticate as today. A revoked old key inside its grace window therefore reads `key_revoked` (SPEC Assumption:
a rotated key can still be revoked).

Time is injectable so the 24 h boundary is testable through HTTP: `createApp(store, { now } = {})`, where `now` is a
`() => Date` defaulting to `() => new Date()`. Each request reads the clock once and passes that `Date` to
`authenticate` and to the key handlers. Existing call sites (`createApp(store)`, `test/helpers.js`) keep working.

The stored shape changes, so the store goes to `SCHEMA_VERSION = 3` with a `2 → 3` migration that sets
`expiresAt: null, revokedAt: null` on every existing key — existing files load and every existing key authenticates
exactly as before (SPEC Constraints). Only SHA-256 hashes are ever stored; no secret is added to any record.

## Applied lessons

- none — the project has no memory-bank yet (`check-lessons-index.mjs --verdict` returned `NO_CANON`), so there are
  no promoted lessons to apply.

## Steps

1. **`src/store.js`** — bump `SCHEMA_VERSION` to 3; add `MIGRATIONS[2]` mapping `doc.keys` to
   `{ ...key, expiresAt: key.expiresAt ?? null, revokedAt: key.revokedAt ?? null }` and setting `schemaVersion: 3`.
   `emptyDocument()` is unchanged (it has no keys).
2. **`src/auth.js`** —
   - `authenticate(doc, header, now = new Date())`: after the existing parse + `timingSafeEqual` check (unchanged, all
     failures still `401 unauthenticated`), apply the state precedence above, throwing `AuthError(401, "key_revoked")`
     / `AuthError(401, "key_expired")`, and return `{ keyId, orgId, role, deprecated }` (`deprecated` is a boolean).
   - Keep the module free of any cache of tokens, secrets or authenticated principals (AC-7). Parse the token so the
     secret is not left as the input of the last RegExp match: V8's legacy `RegExp` statics (`RegExp.input`, `$_`)
     keep the last matched input string alive. Validate/split the `Bearer` header and token with string operations
     (fixed prefix, fixed lengths, character-class check) or otherwise ensure no module-level or engine-level
     reference to the secret survives the call. (Advisory — see Risks for what AC-7 can and cannot show.)
3. **`src/keys.js`** —
   - `findKey(doc, orgId, id)`: the key of `orgId` with that id, else `DomainError(404, "not_found")` — another
     organization's key reads exactly like a missing one (SPEC Constraints).
   - `rotateKey(doc, principal, id, now = new Date())`: `requireAdmin(principal)` **first** (so a member gets `403
     forbidden` — AC-5 — without learning whether the key exists), then `findKey`. A key already revoked, or already
     rotated (`expiresAt` set), is `DomainError(409, "key_not_active")` (see Risks — a plan decision). Create the new
     key with `newKeyMaterial()`, same `orgId`/`role`/`label`, `expiresAt: null`, `revokedAt: null`; set the old key's
     `expiresAt` to `now + 24 h`. Record **one** audit entry, `{ action: "key.rotated", target: oldId, details: {
     newKeyId } }` — not an additional `key.created`, so `key.rotated` is the newest entry (AC-6). Return
     `{ key: presentKey(newKey), token }`, the same shape as `createKey`.
   - `revokeKey(doc, principal, id, now = new Date())`: `requireAdmin`, `findKey`; if not yet revoked set `revokedAt`
     and record `{ action: "key.revoked", target: id }`; an already-revoked key is a no-op (idempotent `204`, no
     second audit entry — see Risks).
   - `createKey` sets `expiresAt: null, revokedAt: null` on new keys so every record has the v3 shape.
   - `presentKey` is unchanged (never the hash).
4. **`src/server.js`** —
   - `createApp(store, { now = () => new Date() } = {})`; read `const at = now()` once per request; pass it to
     `authenticate(store.read(), req.headers.authorization, at)` and into the handler context.
   - Routes: `POST /keys/:id/rotate` → `201`, `store.transact((doc) => rotateKey(doc, principal, id, at))`;
     `DELETE /keys/:id` → `204`, `store.transact((doc) => revokeKey(doc, principal, id, at))`. Place
     `/keys/:id/rotate` before any broader `/keys/...` pattern.
   - `send(res, status, payload, headers = {})`: merge extra headers; for `204` write no body and no JSON
     content-type.
   - When the authenticated principal is `deprecated`, add `Deprecation: true` to the response — on success and on a
     handled error after authentication alike (AC-2).
   - Do not log request headers anywhere (the existing `console.error(err)` logs the error only; keep it that way).
5. **`test/store.test.js`** — the existing "version-1 file is migrated" test asserts `schemaVersion === 2`; change that
   assertion to `SCHEMA_VERSION` (its intent — a v1 file migrates to current — is unchanged) and assert the v1 file's
   keys gain `expiresAt: null, revokedAt: null`. Add the test the README convention requires: a version-2 file with a
   key loads at version 3, the key gains `expiresAt: null, revokedAt: null`, and its token still authenticates
   (SPEC Constraints: existing keys keep authenticating). These are build-owned regression tests, not AC tests.
6. **`README.md`** — add the two endpoints to the table (`POST /keys/:id/rotate` admin → `201 {key, token}`, old key
   valid 24 h with `Deprecation: true`; `DELETE /keys/:id` admin → `204`), and the new error codes `401 key_expired`,
   `401 key_revoked`, `409 key_not_active`.

## Files

- `src/store.js` — `SCHEMA_VERSION` 3 and the `2 → 3` key migration (`expiresAt`, `revokedAt` default `null`)
- `src/auth.js` — `authenticate(doc, header, now)` with revoked / expired / deprecated states after the hash check; no secret retained
- `src/keys.js` — `findKey`, `rotateKey`, `revokeKey`; `createKey` writes the v3 key shape
- `src/server.js` — injectable clock, the rotate and revoke routes, `204` without a body, the `Deprecation: true` header
- `test/store.test.js` — v1 assertion follows `SCHEMA_VERSION`; new v2 → v3 migration test (existing keys still authenticate)
- `README.md` — endpoints table and error codes for rotation and revocation

### Explicitly not touched

- `src/audit.js` — reused as-is (`record()` already carries `details`)
- `src/invoices.js` — `DomainError` reused, unchanged
- `test/helpers.js` — unchanged; `createApp(store)` stays valid, AC tests build their own server where they need a clock or headers
- `package.json` — no new dependencies, no script change (test infrastructure stays out of this increment)

## Acceptance mapping

- **AC-1** (rotate → 201, new id, same role/label, token works on `GET /invoices`) → `rotateKey` + `POST
  /keys/:id/rotate` (Steps 3–4); the new key is a normal active key, so `authenticate` accepts it.
- **AC-2** (old token < 24 h → success + `Deprecation: true`) → old key's `expiresAt = now + 24 h`; `authenticate`
  returns `deprecated: true` in the window; the server adds the header (Steps 2, 4).
- **AC-3** (old token > 24 h → `401 key_expired`) → `now >= expiresAt` after a hash match (Step 2); the injectable
  clock makes it reachable over HTTP.
- **AC-4** (`DELETE /keys/:id` → 204, then `401 key_revoked`) → `revokeKey` + the DELETE route + bodiless 204 (Steps
  3–4); `revokedAt` checked first after the hash match (Step 2).
- **AC-5** (member rotate → `403 forbidden`) → `requireAdmin` before any lookup in `rotateKey` (Step 3).
- **AC-6** (newest `GET /audit` entry is `key.rotated`, target old id, new id in details) → the single audit entry
  `rotateKey` records, `details: { newKeyId }` (Step 3); `listForOrg` already returns newest first.
- **AC-7** (no copy of the old secret in memory after the grace period) → nothing in `src/` stores a secret (only
  SHA-256, unchanged) or caches tokens/principals, and token parsing leaves no engine-level reference to the secret
  (Step 2). See Risks: this is the closest implementable reading, not proof of the SPEC's literal wording.
- **SPEC Constraints** → plaintext never stored (Step 2–3 store only hashes); old files load and old keys
  authenticate (Steps 1, 5); cross-org key → `404 not_found` on rotate and revoke (`findKey`, Step 3); no new
  dependencies (`node:` built-ins only).

## Risks & open questions

- **AC-7 is not verifiable as worded — for the human.** "No copy of the old key's secret remains anywhere in the
  server process's memory" covers native memory (socket and HTTP-parser buffers, OpenSSL/crypto internals, freed but
  unzeroed pages) and a garbage-collected JS heap whose collection timing V8 does not promise. A `unit`-level test can
  at most force a GC in its own process and search a V8 heap snapshot for the secret string after driving
  `rotateKey` + `authenticate` past the grace end. That is evidence about the JS heap reachable from these modules,
  not about "anywhere in the process". Also note the server never held the secret beyond a request in the first
  place (only `sha256(secret)` is stored, today and after this change), so the criterion constrains transient
  handling, not storage. Consider re-specifying AC-7 (e.g. "no key record, cache or module state holds the old
  secret or token after the grace period") via `/pharn-spec`; `/pharn-grill` / triage may route it as `spec`.
- **Is the stored hash a "copy of the secret"?** This plan says no and keeps the old key's hash after expiry, so a
  late caller is told `key_expired` only once it proves it holds the secret. Purging the hash would force answering
  `key_expired` from the key id alone (a weak status oracle for anyone who learns an id). A human decision if the
  intended reading differs.
- **The AC tests may be blocked at `/pharn-test`.** `pharn.config.json` declares no `testResults` format for the
  `test` gate (`node --test`), so the red-run preflight will likely read `ac-level-unavailable` /
  `blocked: no-test-runner` for every AC. The remedy is a separate `spec_kind: test-infra` increment that configures
  per-test results for `node --test` — out of this plan's scope by rule.
- **AC-7 test mechanics (for `/pharn-test`).** Under plain `node --test` there is no `--expose-gc`; the test would
  need `v8.setFlagsFromString("--expose-gc")` + `vm.runInNewContext("gc")` in-body, and must drop its own references
  to the token before snapshotting (and build its search needle only after the snapshot is captured). It must also
  run some unrelated RegExp match before snapshotting if the build still parses with a RegExp, or it will find the
  token in V8's last-match statics.
- **Plan decisions not stated in the SPEC** (implementation choices, flagged so grill can confirm or route them):
  rotating an already-rotated or revoked key → `409 key_not_active`; `DELETE` of an already-revoked key → idempotent
  `204` with no second audit entry; at exactly 24 h the old key is expired (`>=`); `Deprecation: true` is also sent on
  error responses after a deprecated key authenticated; a member calling `DELETE /keys/:id` gets `403 forbidden`
  (the same order as rotate).
- **Existing test edited.** `test/store.test.js`'s literal `schemaVersion === 2` must change with the version bump;
  the edit keeps the test's intent (migrate to current). `/pharn-regress` will see this file in the plan's scope.
- **Integration AC tests need response headers and a 204 with no body**, which `test/helpers.js`'s `request()` (it
  returns only `{status, body}` and always parses JSON) cannot give. The AC test file should start its own server
  with `createServer(createApp(store, { now }))` and use `fetch` directly.
- **Listing keys** shows rotated and revoked keys exactly as today (`presentKey` has no state fields). Showing state
  in `GET /keys` was not asked for and is not planned.
