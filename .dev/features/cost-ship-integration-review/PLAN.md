# PLAN — cost-ship-integration-review

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L34, L37, L43]
- increment: An independent integration review of #232 (6.8.2), #233 (6.9.0) and #234 (6.9.1). It records findings and a reproducible probe, and changes no production code and no release metadata.
- layer(s): build apparatus only (`.dev/features/`)
- constitution_refs: [P0, P2, P6, P7]

## Scope

- **Reviewed HEAD:** `760c5de` on `main`. The review branch is `review/cost-ship-integration`, taken
  from it, and the tree is clean.
- **Commits under review:**
  - `81b5124` (#232, path-free unavailable notes);
  - `9d866ed` (#233, run-scoped accounting, which also carries its own review fixes);
  - `760c5de` (#234, ship outcome applicability, which also carries its review fix).
- **Governing contracts and decisions:** `pharn/pharn-contracts/cost-ledger.md` (the `/2` schema, "Run
  membership", the outcome table), plus the three `.dev/features/*/PLAN.md` and `REVIEW.md` files.
- **Explicitly NOT done here:** production code, `SKILLS_VERSION`, `CHANGELOG.md`, push, merge and
  publish. The prompt forbids them.

## Files

- `.dev/features/cost-ship-integration-review/INTEGRATION-REVIEW.md` — the report: conclusion, findings by severity, per-update + interaction table, checks run, limits — apparatus
- `.dev/features/cost-ship-integration-review/integration-probe.mjs` — the reproducible probe (production CLIs, isolated tmp dirs, synthetic transcripts, explicit timestamps, hand-computed literals); not a `*.test.mjs`, so it never joins `npm test` — apparatus

## Method

Production CLIs (`render-cost-ledger`, `check-cost-ledger`, `render-run-report`, `mark-phase`) are run
through `spawnSync` over synthetic fixtures. Every expected number and decision is a literal computed by
hand. The probe covers:

- **A** — privacy of the unavailable notes;
- **B** — run-window membership, lifecycle, dedup, subagents and `--verify-transcript`;
- **C** — ship applicability and source selection;
- **I** — the interactions the prompt names.

## Applied lessons

- L34 — every per-case assertion in the probe runs over a named, counted case list. An empty result set
  cannot pass.
- L37 — each documented bound is probed against the code rather than read off it. The I1 interaction is
  exactly such a probe: it checks the report's label against what the contract promises.
- L43 — emitter/checker agreement is never taken as evidence. The probe asserts literals (10, 12, 20,
  `stop:pharn-grill`), and `--verify-transcript` is exercised against a row the internal check accepts.

## Guarantee audit (P0)

- The findings are **advisory** review output. The probe's pass/fail results are deterministic over its
  fixtures, but they prove only those fixtures.
- "The agent executes the command prose" is **not** claimed anywhere. No live `/pharn-ship` or
  `/pharn-loop` run was performed.

## Open questions (HALT)

- None. The user delegated plan approval.
