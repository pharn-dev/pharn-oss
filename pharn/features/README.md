# pharn/features/ — product-loop artifacts (what a PHARN user produces)

Each increment a **PHARN user** runs through the product pipeline gets one folder here —
`pharn/features/<feature-name>/` — holding its **process and audit artifacts**:

- `SPEC.md` — intent (Draft → Approved), the root artifact every downstream stage carries `spec_id` from
  (`ARCHITECTURE.md §6`)
- the downstream product-pipeline artifacts as the user runs each stage (`spec → plan → grill → build →
regress → verify → ship`)
- `AC-TESTS.md` and `AC-TESTS.lock.json` (6.17.0) — for a templated SPEC, `/pharn-plan` maps each Acceptance
  Criterion to a test file and public target in `AC-TESTS.md`, and `/pharn-test` writes those tests before the
  build and pins them in the lock (`pharn/pharn-contracts/ac-tests.md`). Since 6.18.0 it also runs them before the
  build, requires each to fail, and records that red run in the lock; a `spec_kind: test-infra` SPEC gets a
  bootstrap lock instead, with no tests and no run

This mirrors `.dev/features/` — but for the **product loop**, not the build loop. The split is the
dev/product boundary made structural:

- **`pharn/features/`** (here) = what a PHARN **user** produces with the `pharn-*` product commands;
- **`.dev/features/`** = the audit trail of **building PHARN itself**, with the `pharn-dev-*` commands
  (contributor apparatus — see `.dev/features/README.md`).

`/pharn-spec` writes the first `SPEC.md` here. Until a user runs it this directory is empty — the
declared home for product-pipeline artifacts, so every product capability lands on the product side of
the boundary from the start, never needing a later migration.

## Upgrading from root `features/` (SKILLS_VERSION 5.0.0)

If your project still has pipeline artifacts under the old root `features/<name>/` tree:

1. Run `pharn update` with **@pharn-dev/pharn 0.5.0** or later — the CLI installs new bytes under `pharn/features/` and warns when a root copy is left behind.
2. Move or recreate artifacts under `pharn/features/<name>/` (or start a fresh increment there).
3. Delete the obsolete root `features/` tree when you no longer need it — reconcile and regress no longer treat those paths as pipeline exemptions, and the write-guard default no longer allows agent scratch writes there.

Root `features/` may still exist for **your own** application code (Cucumber, feature-sliced layouts); PHARN simply no longer uses it as the product artifact root.
