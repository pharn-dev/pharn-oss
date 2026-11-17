# VERIFY — setter-dropped-bullets

- Tree: build round 2 (`78165231`, after the merge of `origin/main` at 7.21.0, the 7.22.0 renumber and the regenerated
  `pharn-install.json`).
- Gates: `pharn/floor/run-gates.mjs` (`init --stage verify`, then `run --next` per gate); verdict:
  `pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json --feature setter-dropped-bullets`
  → exit `0`. Machine report: `verify-report.json` (the helper's stdout verbatim, plus the advisory `verifiers` block).
- A first verify run on the merged tree was stopped during its `test` gate, before any gate finished, when
  `docs:check` showed `pharn-install.json` stale; that is build round 2 (`PLAN.md`). This is the run that followed.

## Gates (exit codes)

| Gate               | exit |
| ------------------ | ---- |
| test               | 0    |
| validate           | 0    |
| lint               | 0    |
| format:check       | 0    |
| lint:md            | 0    |
| instruction-growth | 0    |
| reconcile          | 0    |

`test` took 1,461 s on this loaded host. `reconcile` judged the round-2 epoch (anchored after the maintainer's 7.22.0
setter renumber, `843212ab`); the round-1 epoch was reconciled before the re-anchor: `CLEAN`, `escapes: []`, 23
`merged`. Build completeness (`stamp.aux`): every concrete `## Files` path present.

**VERIFIED: floor gates PASS** (`gate_run.stamp_sha256`
`94a6888d47cc5290ce7cb232ceb70bf9733b6e34fbff3eedd27273a83165acac`).

## Verifiers

No verifiers registered (`count-verifiers.mjs`: `registered: 0`) — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. The stamp certifies internal consistency, never provenance (L43).
