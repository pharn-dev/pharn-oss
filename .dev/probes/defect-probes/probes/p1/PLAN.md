---
spec_id: invoice-refunds
spec_content_hash: 3909b299aca02e593ef019f0e6c3ee78d5ec2275075850283af735b59b664430
applied_lessons: none
---

## Approach

Refunds become a list on the invoice record, the same way payments already are: an invoice keeps `payments[]` and
gains `refunds[]`, and the refunded amount is always derived from that list rather than stored as a running total, so
the two can never disagree. A new module, `src/refunds.js`, owns the domain rules (who may refund, which invoices,
how much, idempotency) and is called from one new write route and one new read route in `src/server.js`. Everything
that changes the document runs inside `store.transact()`, which already serializes writes and leaves the file
untouched when a handler throws, so a refused refund never half-applies.

Adding `refunds[]` and the per-invoice idempotency map changes the stored shape of an invoice, so the store moves to
schema version 3 with a migration step that gives every existing invoice empty values. Step 5 says how a refund
amount is read and compared; only `present()` turns stored amounts into strings.

The acceptance criteria are all integration-level (HTTP in, HTTP out). Their tests are mapped in `AC-TESTS.md` and
written by `/pharn-test` before the build, so this plan names only the implementation files and the one ordinary
regression test the migration needs.

## Applied lessons

- none — this project has no memory-bank yet (`pharn/memory-bank/lessons-learned.md` does not exist).

## Steps

1. **Store: schema version 3.** In `src/store.js`, set `SCHEMA_VERSION = 3` and add `MIGRATIONS[2]`, which returns
   the document at version 3 with every invoice given `refunds: []` and `refundKeys: {}` (spread, never mutating the
   input, like the existing step 1). `emptyDocument()` needs no change: it holds no invoices.
2. **Migration test.** In `test/store.test.js`, add a case that writes a version-2 file holding one paid invoice with
   one payment, loads it, and asserts `schemaVersion` 3, `refunds` `[]`, `refundKeys` `{}`, and the payment intact.
   Keep the existing version-1 case: it now runs both steps in sequence.
3. **Domain module.** Create `src/refunds.js` exporting `refundInvoice(doc, principal, id, body, idempotencyKey,
   now)`, `listRefunds(doc, principal, id)` and `presentRefund(refund)`. It imports `findInvoice` and `DomainError`
   from `src/invoices.js`, `requireAdmin` from `src/auth.js`, the money helpers, and `record` from `src/audit.js`.
4. **Look up the invoice in the organization named in the request.** `refundInvoice` loads the invoice with
   `findInvoice(doc, body.orgId ?? principal.orgId, id)`, so a parent organization's admin can refund on behalf of a
   child organization by sending its `orgId`; an id that matches no invoice there is `404 not_found` (AC-4).
5. **Validate the amount in minor units.** Parse `amount` with `parseMinor()` from `src/money.js` (a `MoneyError` maps
   to `422 amount_invalid`, and 0 is refused the same way), then compute `remaining = paidMinor - refundedMinor` in
   integer cents, where both sums come from `sumMinor()` over the invoice's payments and refunds.
6. **Order of checks.** After the lookup: `requireAdmin(principal)` (`403 forbidden`, AC-3); then the status check,
   `status !== "paid"` → `409 invoice_not_paid` (AC-7); then the idempotency replay (step 7); then the amount (step
   5): an amount above `remaining` is `422 refund_exceeds_remaining` (AC-2). The lookup comes first so that a member
   probing another organization's ids gets 404, not 403, which would confirm the id exists.
7. **Idempotency.** When the request carries `Idempotency-Key`, look it up in `invoice.refundKeys`. A hit returns the
   stored refund with `replayed: true` and changes nothing, so the route answers 200 (AC-5). A miss records the new
   refund's id under the key. Keys are 1–100 printable ASCII characters; anything else is `422
   idempotency_key_invalid`. The map lives on the invoice, so one key may be reused on another invoice. A replay with
   a different amount still returns the original refund: the key, not the body, identifies the request.
8. **Recording.** A new refund is `{id: randomUUID(), amountMinor, reason, actor: principal.keyId, at:
   now.toISOString()}`, pushed onto `invoice.refunds`. `reason` is optional, trimmed, at most 200 characters (longer is
   `422 reason_invalid`). Then `record(doc, {orgId, actor: principal.keyId, action: "invoice.refunded", target:
   invoice.id, details: {refundId, amount}})` (AC-6). The invoice's `status` stays `paid`, even when fully refunded:
   the SPEC adds no status.
9. **Presenting.** `presentRefund` returns `{id, amount, reason, actor, at}` with `amount` from `formatMinor()`. In
   `src/invoices.js`, `present()` gains `refunded: formatMinor(sumMinor((invoice.refunds ?? []).map((r) =>
   r.amountMinor)))` beside `paid`. The `?? []` is defensive only; after the migration every invoice has the list.
10. **Routes.** In `src/server.js`, add `POST /invoices/:id/refunds` → `store.transact((doc) => refundInvoice(doc,
    principal, params[0], body, req.headers["idempotency-key"]))`, answering 201 with the presented refund, or 200
    when the result is a replay; and `GET /invoices/:id/refunds` → `listRefunds` (member role, newest first). The
    route table's handler signature gains `headers`, passed through from `handle`.
11. **Docs.** Add both endpoints to the README's endpoint table and the new error codes to its error list.
12. **Run the suite** (`npm test`); the acceptance tests from `AC-TESTS.md` must pass and the existing suites stay
    green.

## Files

- `src/refunds.js` — new: refund rules, idempotency, presentation
- `src/invoices.js` — `present()` adds `refunded`
- `src/store.js` — schema version 3 and the 2→3 migration
- `src/server.js` — the two refund routes; headers reach handlers
- `test/store.test.js` — the version-2 migration case
- `README.md` — endpoint table and error codes

### Explicitly not touched

- `src/money.js` — reused as is; no new helper is needed.
- `src/auth.js` — `requireAdmin` is reused; authentication does not change.
- `src/audit.js` — `record()` already takes free-form `details`.
- `test/invoices.test.js` — existing invoice behaviour is unchanged and its suite must stay green.

## Acceptance mapping

- AC-1 → steps 4–10: a paid invoice, an admin, an amount under `remaining`; 201 from the route, `refunded` from
  `present()`. Test: `test/refunds.acceptance.test.js`, "records a partial refund".
- AC-2 → steps 5–6: the remaining-amount computation and the `refund_exceeds_remaining` refusal, raised inside
  `transact` so nothing is written. Test: "refuses a refund above the remaining amount".
- AC-3 → step 6: `requireAdmin` after the lookup. Test: "a member key cannot refund".
- AC-4 → step 4: the invoice lookup. Test: "another organization's invoice is 404".
- AC-5 → step 7: the per-invoice idempotency map and the 200 replay. Test: "a retried request records one refund".
- AC-6 → step 8: the `invoice.refunded` audit entry with refund id and amount. Test: "a refund is audited".
- AC-7 → step 6: the status check. Test: "an open invoice cannot be refunded".

## Risks & open questions

- **Concurrency.** Two simultaneous refunds on one invoice could both pass the remaining-amount check if they ran in
  parallel. They cannot: `store.transact()` runs one change at a time, and each change reads the invoice from the
  document it is about to write.
- **File growth.** `refundKeys` grows with every keyed refund and is never pruned. The SPEC's assumption accepts this
  at current volumes; a later feature can expire keys.
- **Fully refunded invoices** keep `status: "paid"`. A reporting change may want a `refunded` status later; the SPEC
  rules it out of scope.
- **Downgrade.** A file migrated to version 3 cannot be read by the previous release, which refuses unknown versions
  (`migrate()` throws). Deploys are forward-only today; this is noted in the README's upgrade line.
