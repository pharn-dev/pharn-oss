---
spec_id: invoice-refunds
state: Approved
spec_content_hash: 443c0370d1225e8f189c843114522727ab43251a29fcd7114182c52de2c05728
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

Organizations that bill through tally-ledger cannot give money back. When a customer is overcharged or returns part
of an order, the invoice is already paid and cannot be voided, so the finance team refunds outside the system
and the ledger stops matching the bank. They want to record a refund against a paid invoice, partial or full, from the
API they already use, and see it on the invoice and in the audit log. This matters now because the two largest
customer organizations have started reconciling monthly and every manual refund shows up as a discrepancy.

## Scope

**In scope:**

- Recording a refund of part or all of a paid invoice's paid amount, by an organization admin.
- Showing the refunded amount on the invoice, and listing an invoice's refunds.
- Rejecting a refund that would take the total refunded above what was paid.
- Making a retried refund request safe: the same request sent twice records one refund.
- An audit entry for every refund.

**Out of scope (non-goals):**

- Moving money: tally-ledger records refunds, a person or another system sends them.
- Refunds on invoices that are open or void.
- Cancelling or editing a refund once recorded.
- Credit notes, store credit, or refunds in another currency.

## Scenarios

- A finance admin finds a paid invoice of 100.00, refunds 30.00 for a returned item, and later refunds the remaining
  70.00 when the customer cancels; the invoice then shows 100.00 refunded and a third refund attempt is refused.
- A billing script retries a refund call after a network timeout, sending the same idempotency key; the customer is
  refunded once.

## Acceptance Criteria

- **AC-1** Given a paid invoice with a total of 100.00 When an admin of its organization posts a refund of 30.00 to
  `/invoices/:id/refunds` Then the response is 201 with the refund's id and amount "30.00", and a following
  `GET /invoices/:id` shows `refunded` "30.00"
  - verify: integration
- **AC-2** Given a paid invoice of 100.00 with refunds totalling 80.00 When an admin posts a refund of 30.00 Then the
  response is 422 with error `refund_exceeds_remaining` and the invoice still shows `refunded` "80.00"
  - verify: integration
- **AC-3** Given a paid invoice When a member (non-admin) key posts a refund Then the response is 403 with error
  `forbidden`
  - verify: integration
- **AC-4** Given a paid invoice that belongs to another organization When an admin posts a refund to it Then the
  response is 404 with error `not_found` and that invoice's refunds are unchanged
  - verify: integration
- **AC-5** Given an admin has posted a refund of 10.00 with header `Idempotency-Key: k1` When the same request with
  the same key is posted again Then the response is 200 with the same refund id, and the invoice shows `refunded`
  "10.00"
  - verify: integration
- **AC-6** Given a refund has been recorded When an admin requests `GET /audit` Then the newest entry has action
  `invoice.refunded`, the invoice's id as target, and the refunding key's id as actor
  - verify: integration
- **AC-7** Given an open invoice When an admin posts a refund to it Then the response is 409 with error
  `invoice_not_paid`
  - verify: integration
- **AC-8** Given a paid invoice of 100.00 with refunds totalling 80.00 When an admin posts a refund of 30.00 Then the
  response is 201, the recorded refund's amount is "20.00" (the remaining refundable amount), and the invoice shows
  `refunded` "100.00"
  - verify: integration

## Constraints

- Amounts follow the existing money convention: decimal strings with exactly two fraction digits on the API, integer
  minor units inside the service. A refund amount must be greater than zero.
- No new runtime dependencies.
- Existing data files must keep loading; a change to a stored record's shape goes through the store's versioned
  migrations.
- `GET /invoices/:id` keeps its current fields; `refunded` is added beside `paid`.

## Data

- A refund belongs to exactly one invoice, has an amount, an optional reason, the key that recorded it, and when.
- An invoice's refunded amount is the sum of its refunds and never exceeds its paid amount.

## Assumptions

- Idempotency keys are remembered per invoice for the life of the data file; no expiry is needed at current volumes.
- A refund reason is free text of at most 200 characters and is optional.
