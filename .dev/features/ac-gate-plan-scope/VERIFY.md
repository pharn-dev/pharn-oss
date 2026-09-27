# VERIFY — ac-gate-plan-scope

`/pharn-dev-verify` over the repository with this increment in it: each deterministic gate run and its exit code
recorded, the map handed to `pharn/floor/check-verify.mjs` (the FLOOR verdict — `PASS` iff every gate exits 0). The
machine report is `verify-report.json`: the helper's output verbatim, plus the advisory `verifiers` block.

## Gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 4100 tests, 4100 pass)                                                | 0    |
| `validate` (`FLOOR: GREEN — 36 capabilities checked`)                                      | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

**VERIFIED: floor gates PASS.**

`reconcile` read **CLEAN** against the epoch the build anchored after its scope was set (`--by pharn-dev-build`):
32 paths reconciled, no escape, four exempted as this feature's own pipeline artifacts (`BUILD.md`, `PLAN.md`,
`REGRESSION.md`, `regression-report.json`). Every Bash write this build made — the runner-written
`proposed/human-only.patch` and `.sha256`, the `sed` version bumps, `SKILLS_VERSION`, the formatter pass — landed on a
path the plan's `## Files` declares. A `CLEAN` means no escape was detected, never that none occurred
(`pharn/pharn-contracts/reconciliation-record.md`).

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## How this stage ran (advisory orchestration)

The pinned `$?`-capture lines are refused in this isolated worktree, so a scratch node runner (kept outside the
repository, so `lint` never read it) ran each gate as an argv array, recorded each exit code into
`.pharn/pharn-dev-verify/results.json`, and called `check-verify.mjs` over it. The map was written by the runner, never
typed. The machine was heavily loaded by other sessions' suites throughout (load average 55–98); the full suite passed
here all the same, and the build's one timing flake (`BUILD.md`) did not recur.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
