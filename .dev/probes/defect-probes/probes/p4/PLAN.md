---
spec_id: api-key-rotation
spec_content_hash: 57bfa7ca4d53f142d596f60e10455ef2877e351ffa98412a3a02342729149cae
applied_lessons: none
---

## Approach

A rotation creates a new key and marks the old one: the old record keeps its hash and gains `rotatedAt`,
`expiresAt` (rotation time plus 24 hours) and `replacedBy` (the new key's id). Nothing is deleted, so the audit log's actor ids keep pointing at real records. `authenticate()` in `src/auth.js` learns the
two states after it has matched the secret: past `expiresAt` → `401 key_expired`,
inside the grace period → a principal flagged `deprecated`, which `src/server.js` turns into the `Deprecation: true`
response header.

The key routes move out of `src/keys.js`'s single create/list pair into a small set: create, list, rotate. All
three take the organization from the authenticated key, as every route does today, so another organization's key id
reads as `404 not_found`.

The new fields change the stored shape of a key; steps 1 and 2 say how existing data files carry over, and the SPEC
requires every token issued before the upgrade to keep authenticating.

The acceptance criteria are integration-level. Their tests are mapped in `AC-TESTS.md` and written by `/pharn-test`
before the build; this plan names the implementation files and the ordinary regression tests the stored-record change
and the authentication change need. Time is injected (`now` parameters, as `src/invoices.js` already does) so the 24-hour
boundary can be tested without waiting.

## Applied lessons

- none — this project has no memory-bank yet (`pharn/memory-bank/lessons-learned.md` does not exist).

## Steps

1. **Store: schema version 3.** In `src/store.js`, set `SCHEMA_VERSION = 3` and add `MIGRATIONS[2]`, which gives every
   existing key `rotatedAt: null`, `expiresAt: null` and `replacedBy: null`, leaving `hash` as it is,
   so every key that authenticates today still authenticates after the upgrade.
2. **Migration test.** In `test/store.test.js`, write a version-2 file holding one key, load it, and assert version 3,
   the three new fields null and `hash` unchanged; in `test/auth.test.js`, assert that key's token still authenticates.
3. **Grace period constant.** `GRACE_MS = 24 * 60 * 60 * 1000` in `src/keys.js`, exported for the tests. The SPEC
   fixes it at 24 hours and rules out configuring it.
4. **Authentication states.** `authenticate(doc, header, now = new Date())` keeps its token parsing and hash
   comparison unchanged and then checks, in order:
   `key.expiresAt` set and `now >= expiresAt` → `AuthError(401, "key_expired")`; `key.replacedBy` set (so still inside
   the grace period) → the principal gets `deprecated: true`.
5. **Rotate.** `rotateKey(doc, principal, id, now)` in `src/keys.js`: `requireAdmin` (`403 forbidden`, AC-5); find the
   key in the caller's organization (`404 not_found` otherwise); refuse a key that is already
   rotated with `409 key_not_active`; create the new key with `newKeyMaterial()` and the old key's `role` and `label`;
   set the old key's `rotatedAt = now`, `expiresAt = now + GRACE_MS`, `replacedBy = newKey.id`. Returns `{key, token}`
   exactly as `createKey` does, and the token is shown once.
6. **Audit.** Rotation records `key.rotated` with the old key's id as target and `{newKeyId}` in details (AC-6),
   naming the acting key.
7. **Routes.** In `src/server.js`: `POST /keys/:id/rotate` → 201 with `{key, token}`, inside `store.transact()`. `handle` passes `now`
   to `authenticate` and, when the principal is `deprecated`, sets `Deprecation: true` on every response, including
   error responses, so a client sees it whatever it called.
8. **Listing.** `presentKey()` adds `rotatedAt`, `expiresAt` and `replacedBy`, so an admin can see which
   keys are in their grace period. It still never includes `hash`.
9. **Authentication tests.** In `test/auth.test.js`, add unit cases for the two states at the boundary: `now` one
   millisecond before `expiresAt` (deprecated) and exactly at it (expired).
10. **Docs.** README: the endpoint, the new error codes, the `Deprecation` header and the 24-hour rule.
11. **Run the suite** (`npm test`); the acceptance tests from `AC-TESTS.md` must pass and the existing suites stay
    green.

## Files

- `src/store.js` — the key record's new fields (step 1)
- `src/auth.js` — expired and deprecated states; `now` parameter
- `src/keys.js` — `rotateKey`, `GRACE_MS`, the wider `presentKey`
- `src/server.js` — the rotate route and the `Deprecation` header
- `test/store.test.js` — the stored-record case (step 2)
- `test/auth.test.js` — pre-upgrade token, and the two states at their boundaries
- `README.md` — endpoint, error codes, header, grace period

### Explicitly not touched

- `src/invoices.js` — invoices do not change.
- `src/audit.js` — `record()` already takes free-form `details`.
- `src/money.js` — unrelated.

## Acceptance mapping

- AC-1 → step 5: `rotateKey` returns the new key with the old role and label, and its token authenticates. Test:
  `test/keys.acceptance.test.js`, "rotation returns a working key".
- AC-2 → steps 4 and 7: the `deprecated` principal and the response header. Test: "the old key works with a
  deprecation header".
- AC-3 → step 4: `now >= expiresAt` → `key_expired`, with `now` injected. Test: "the old key expires after 24 hours".
- AC-5 → step 5: `requireAdmin` first. Test: "a member key cannot rotate".
- AC-6 → step 6: the `key.rotated` entry with `newKeyId`. Test: "a rotation is audited".

## Risks & open questions

- **Injected time in the acceptance tests.** The acceptance tests drive HTTP, where `now` is the server clock. To test
  AC-3 without waiting 24 hours they need a way to move the clock: `createApp(store, {now})` takes an optional clock
  function, defaulting to `() => new Date()`. This is a test seam, not a feature.
- **Downgrade.** Deploys are forward-only today; a data file written by this release is not supported by the
  previous one.
- **Deprecation on errors.** Setting the header on error responses too is a choice the SPEC does not make; it is the
  more useful one for a client deciding when to redeploy.
