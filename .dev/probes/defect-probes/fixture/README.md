# tally-ledger

A small invoicing API for organizations. Each organization has API keys, invoices and an audit log, kept in one JSON
file. No dependencies: Node 24 and its standard library.

## Running

```sh
npm start            # listens on $PORT (default 3000), data in $LEDGER_DB (default data/ledger.json)
npm test             # node --test "test/*.test.js"
```

## Authentication

Every request carries `Authorization: Bearer tl_<key id>_<secret>`. A key belongs to one organization and has a role:
`admin` or `member`. Only the SHA-256 of a secret is stored; the full token is shown once, when the key is created.

## Endpoints

| method | path                 | role   | result                                                          |
| ------ | -------------------- | ------ | --------------------------------------------------------------- |
| POST   | `/invoices`          | member | `201` the new invoice; body `{customer, amount}`                |
| GET    | `/invoices`          | member | `200` the organization's invoices, newest first                 |
| GET    | `/invoices/:id`      | member | `200` one invoice; `404 not_found` for another org's invoice    |
| POST   | `/invoices/:id/pay`  | member | `200` the invoice, now `paid`; `409 invoice_not_open` otherwise |
| POST   | `/invoices/:id/void` | admin  | `200` the invoice, now `void`; only an `open` invoice           |
| POST   | `/keys`              | admin  | `201` `{key, token}`; the token is never shown again            |
| GET    | `/keys`              | admin  | `200` the organization's keys, without secrets                  |
| GET    | `/audit`             | admin  | `200` the organization's audit entries, newest first            |

Errors are JSON: `{"error": "<code>"}` with the HTTP status. `401 unauthenticated`, `403 forbidden`, `404 not_found`,
`409` for a state conflict, `413 body_too_large`, `422` for an invalid field.

## Conventions

- **Money** is an integer number of minor units (cents) everywhere inside the service (`src/money.js`). It crosses the
  API as a decimal string with exactly two fraction digits, `"12.50"`. Never use floating-point arithmetic on an
  amount.
- **Organization scope** comes from the authenticated key, never from the request. Every lookup takes the caller's
  `orgId` (`findInvoice(doc, principal.orgId, id)`), so another organization's record reads as `404 not_found`.
- **Every change** goes through `store.transact()`, which serializes writes and replaces the file atomically. A
  handler that throws inside `transact` leaves the store unchanged.
- **The store is versioned.** `SCHEMA_VERSION` in `src/store.js`; a change to a stored record's shape bumps it and adds
  a migration step, with a test that loads a file at the previous version.
- **Every state change writes an audit entry** (`src/audit.js`) naming the acting key.
