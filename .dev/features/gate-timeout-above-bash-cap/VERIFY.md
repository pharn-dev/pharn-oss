# VERIFY — gate-timeout-above-bash-cap

- measured: 2026-11-16, re-run on the final tree after the review fix round, at HEAD `edd15ea4` plus the
  working-tree build (nothing committed yet), through `pharn/floor/run-gates.mjs` (the pinned `init` line, then one
  `run --next --timeout-ms 3600000` per gate; the `test` gate as a background call). The first run (stamp `e88393d5…`,
  PASS, before the fix round) is superseded.
- PR round (2026-11-16): re-run after restoring three base test titles in `gate-exclusion-core.test.mjs` that CI's
  test-integrity check read as removed tests, under a fresh build anchor. The fix-round stamp `3ba85552…` (PASS) is
  superseded.
- stamp: `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256 `b0c0b1975739291bcae886a7b1bc8c8e75c6315bcbebd76d384f102e79d7af81`
  (`worktree-fingerprint/3+sha256`, final `d04dc6cb…`)
- machine report: `verify-report.json` (the `check-verify.mjs --stamp` output verbatim, plus the advisory `verifiers`
  block)

## FLOOR layer — the verdict

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`test`: 6839 tests, 6831 pass, 0 fail, 8 skipped (824 s, on a host shared with another session's run). Build completeness (`stamp.aux.completeness`): 0 — every
concrete `## Files` path is present.

**VERDICT: PASS** (`check-verify.mjs` exit 0) — the named gates passed. That is the whole content of the verdict: it
guarantees what these gates check and nothing more. A defect no test, eval, rule or lint covers is invisible to it. The
stamp certifies internal consistency, never provenance (L43).

`reconcile` exit 0: no write the guards would have denied was detected since the build's anchor. That is a statement
about detection, never that no such write occurred (`pharn/pharn-contracts/reconciliation-record.md`).

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`: no verifiers registered — floor gates
only.

## Acceptance criteria (advisory cross-reference, not a gate)

The ticket's criteria map to tests the `test` gate ran:

- AC1 (no declaration → byte-identical): `entry-gates.test.mjs` "CLI timeout AC1", `stage-direct.test.mjs` "timeout
  AC1", `gate-timeout-core.test.mjs` "AC1", `gate-exclusion-core.test.mjs` no-change cases.
- AC2 (measured before T, unmeasured past it): `entry-gates.test.mjs` "CLI timeout AC2" (entry) and
  `stage-direct.test.mjs` "timeout AC2/AC4 (real stage-regress)". At verify it is shown through the declared value
  reaching the verify script's argv (fake script), not through the real `stage-verify.mjs` — a narrowing of the plan's
  evals list, recorded here.
- AC3 (floor-read, closed shape, upper bound): `gate-timeout-core.test.mjs`, `gate-exclusion-core.test.mjs`,
  `run-gates.test.mjs` "7.16.0".
- AC4 (same value on both sides): the real stage-regress test (base and head both timed out, then both measured); the
  one recorded value across a runner's resumes with a declared value above `--budget-ms`: `stage-direct.test.mjs`
  "timeout (review R4)".
- AC5 (older floor's message names the remedy): from 7.16.0 only, `gate-exclusion-core.test.mjs` "AC5"; floors ≤ 7.15.0
  keep their message (GATE 1 decision D2), stated in the CHANGELOG and `docs/pipeline.md`.
- AC6 (stop text names the declaration): `command-hygiene.test.mjs` "AC6 (7.16.0)".
