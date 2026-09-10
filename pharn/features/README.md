# pharn/features/ — product-loop artifacts (what a PHARN user produces)

Each increment a **PHARN user** runs through the product pipeline gets one folder here —
`pharn/features/<feature-name>/` — holding its **process and audit artifacts**:

- `SPEC.md` — intent (Draft → Approved), the root artifact every downstream stage carries `spec_id` from
  (`ARCHITECTURE.md §6`)
- the downstream product-pipeline artifacts as the user runs each stage (`spec → plan → grill → build →
regress → verify → ship`)

This mirrors `.dev/features/` — but for the **product loop**, not the build loop. The split is the
dev/product boundary made structural:

- **`pharn/features/`** (here) = what a PHARN **user** produces with the `pharn-*` product commands;
- **`.dev/features/`** = the audit trail of **building PHARN itself**, with the `pharn-dev-*` commands
  (contributor apparatus — see `.dev/features/README.md`).

`/pharn-spec` writes the first `SPEC.md` here. Until a user runs it this directory is empty — the
declared home for product-pipeline artifacts, so every product capability lands on the product side of
the boundary from the start, never needing a later migration.
