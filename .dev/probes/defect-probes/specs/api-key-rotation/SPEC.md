---
spec_id: api-key-rotation
state: Approved
spec_content_hash: 57bfa7ca4d53f142d596f60e10455ef2877e351ffa98412a3a02342729149cae
spec_template: pharn-default@sha256:0ac964d307ef33dc333d1eae764877b6ea5ae4006fe3fcad4dc54ed58a0478a4
---

## Intent

API keys in tally-ledger live forever. An organization that suspects a leaked key, or that rotates credentials on a
schedule for its auditors, can only create a new key and then ask us to delete the old one by hand, and every
integration using the old key breaks at that moment. Admins want to rotate a key themselves, with a grace period in
which the old key still works so integrations can be redeployed, and to revoke a key immediately when it is known to
be leaked. This matters now because one customer's annual audit requires key rotation every 90 days, starting next
quarter.

## Scope

**In scope:**

- Rotating a key: a new key with the same role and label, and the old key kept working for 24 hours.
- Telling a caller that its key is deprecated during the grace period.
- Revoking a key immediately.
- Audit entries for rotation and revocation.

**Out of scope (non-goals):**

- Automatic or scheduled rotation.
- Changing a key's role during rotation.
- Notifying anyone by email or webhook.
- A grace period other than 24 hours.

## Acceptance Criteria

- **AC-1** Given an admin key When it posts to `/keys/:id/rotate` for a key of its organization Then the response is
  201 with a new key id, the same role and label as the old key, and a token that authenticates on `GET /invoices`
  - verify: integration
- **AC-2** Given a key rotated less than 24 hours ago When a request uses the old key's token Then the request
  succeeds and the response carries the header `Deprecation: true`
  - verify: integration
- **AC-3** Given a key rotated more than 24 hours ago When a request uses the old key's token Then the response is 401
  with error `key_expired`
  - verify: integration
- **AC-4** Given an admin revokes a key with `DELETE /keys/:id` When a later request uses that key's token Then the
  response is 401 with error `key_revoked`, and the revoke itself returned 204
  - verify: integration
- **AC-5** Given a member (non-admin) key When it posts to `/keys/:id/rotate` Then the response is 403 with error
  `forbidden`
  - verify: integration
- **AC-6** Given a key has been rotated When an admin requests `GET /audit` Then the newest entry has action
  `key.rotated`, the old key's id as target, and the new key's id in its details
  - verify: integration

## Constraints

- Secrets are never stored in plaintext: only the SHA-256 of a secret is kept, as today.
- Existing data files must keep loading, and every existing key must keep authenticating after the upgrade; a change
  to a stored record's shape goes through the store's versioned migrations.
- A key of another organization reads as `404 not_found` on every key route.
- No new runtime dependencies.

## Assumptions

- "24 hours" is measured from the rotation time on the server clock; clock skew between instances is not a concern
  with a single instance.
- A rotated old key can still be revoked during its grace period.
