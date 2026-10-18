# VERIFY — grill-griller-slim

**VERIFIED: floor gates PASS.** `pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature
grill-griller-slim` exit `0`, `"verdict": "PASS"`, `failing_gates: []` (`verify-report.json`).

## Floor gates (exit codes, at `6892f61`)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 5,511 tests, 0 failed, 1 skipped)                                      |    0 |
| `validate` (`node pharn/floor/validate.mjs .`: GREEN, 37 capabilities)                     |    0 |
| `lint` (`npm run lint`)                                                                    |    0 |
| `format:check` (`npm run format:check`)                                                    |    0 |
| `lint:md` (`npm run lint:md`: 1,861 files)                                                 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       |    0 |

The `reconcile` gate read `CLEAN`: the epoch anchored by `pharn-dev-build` at Step 0, 18 paths reconciled, `escapes: []`.
It exempted this feature's `REGRESSION.md` and `regression-report.json` (each written by `/pharn-dev-regress` under its
own scope), and listed nothing as `merged`.

The structural gate's pair was confirmed readable before it ran. It passed 6 `structural[]` assertions and left 2
`semantic[]` assertions to the advisory judge (not evaluated here).

## Verifiers (ADVISORY layer)

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. No verifiers registered — floor gates only.

## How the gates were run (a recorded deviation)

This ran in an isolated agent worktree, where the harness refuses the command's pinned shell form (`t=$?` capture, the
`printf` assembly, redirects). The same seven gates ran, in the command's order, through a scratch node runner,
`.pharn/pharn-dev-verify/run.mjs`. Each ran with `spawnSync` and an argv array, and each recorded its real exit status
into `.pharn/pharn-dev-verify/results.json`; the verdict came from `check-verify.mjs` over that map. Each gate ran
once; none was re-run.

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check; verifier
concerns are advisory help, not assurance.

## GATE 2 fix round (2026-10-18)

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit `0`, `"verdict": "PASS"`, `failing_gates: []`, at `8be8e79`
(the fix-round build `c3bfd20` plus its regress record). The helper's output, merged with the empty verifiers block, is
byte-for-byte the `verify-report.json` already committed, so that file did not change.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 5,515 tests, 0 failed, 1 skipped)                                      |    0 |
| `validate` (`node pharn/floor/validate.mjs .`: GREEN, 37 capabilities)                     |    0 |
| `lint` (`npm run lint`)                                                                    |    0 |
| `format:check` (`npm run format:check`)                                                    |    0 |
| `lint:md` (`npm run lint:md`: 1,863 files)                                                 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       |    0 |

`reconcile` read `CLEAN` against the NEW epoch the fix-round build anchored at its Step 0 (`2026-10-18T15:58:07Z`, scope
25 paths): 18 paths reconciled (the 13 grillers, the two extract files, `CHANGELOG.md`, `MEASUREMENTS.md`,
`measure.mjs`), `escapes: []`, nothing `merged`. It exempted `REGRESSION.md` and `regression-report.json`, written by
`/pharn-dev-regress` under its own scope.

Verifiers: `{"registered":0,"verifiers":[]}` — floor gates only. The gates ran through the same scratch node runner as
the first round (the recorded deviation above), once each, with none re-run.

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check.

## GATE 2 fix round 2 (review findings 8, 9 — 2026-10-18)

The edits: both grill commands' griller-file figure (`189,192 →` became `194,015 →`, finding 8), and the
"0 more bytes" claim in `CHANGELOG.md` and the `griller-extract.mjs` header, now bounded to a grill that loads the
extract, with the 4,823 B a whole-file fallback reads (finding 9).

### Attempt 1 — FAIL, recorded verbatim

Built on the fix round's epoch (anchored `2026-10-18T15:58:07.798Z`) with its scope amended (`--amend-scope`), at
`8a22676` plus the four uncommitted edits. Six gates were 0; `reconcile` exited `1`, so `check-verify.mjs` returned
`"verdict": "FAIL"`, `failing_gates: ["reconcile"]`. Its report:

- `"verdict": "ESCAPE"`, 21 paths reconciled.
- `escapes`: `{"file": ".dev/memory-bank/lessons-learned.md", "denied_by": "protect-trusted-paths.cjs"}`.
- `exempted`: `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json` (this feature's) and
  `docs/lessons-index.md`. `merged`: empty.

Cause: the L74 promotion (`8a22676`) was written in the orchestrator's checkout, under `/pharn-dev-memory-promote`'s
scope and human gate, and reached this worktree by fast-forward after this epoch's anchor. `merged` covers only bytes
equal to `origin/main`'s, so the epoch counted the canon change as an escape; it cannot attribute a write from another
worktree (the contract's "one worktree per session" bound). The stage stopped there and nothing was committed.

### The re-anchor, at the orchestrator's decision

Nothing in the baseline was edited or deleted. The four edited files were restored to `8a22676`'s bytes
(`git restore`), leaving a clean tree. Build Step 0 then ran as the command prescribes: `set-writes-scope --from-plan`
(25 paths), then `reconcile-baseline --anchor --by pharn-dev-build`, a new epoch at `2026-10-18T17:11:30.400Z` after
the promotion commit. The four edits were redone through Edit, formatted with the stage's own step on those four files
only, and `validate.mjs .` exited 0.

### Attempt 2 — PASS

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit `0`, `"verdict": "PASS"`, `failing_gates: []`. The helper's
output with the empty verifiers block is byte-for-byte the committed `verify-report.json`, so that file did not change.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 5,515 tests, 0 failed, 1 skipped)                                      |    0 |
| `validate` (`node pharn/floor/validate.mjs .`: GREEN, 37 capabilities)                     |    0 |
| `lint` (`npm run lint`)                                                                    |    0 |
| `format:check` (`npm run format:check`)                                                    |    0 |
| `lint:md` (`npm run lint:md`)                                                              |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       |    0 |

`reconcile` read `CLEAN` on the new epoch: 4 paths reconciled (the two grill commands, `CHANGELOG.md`,
`pharn/floor/griller-extract.mjs`), `escapes: []`, nothing `exempted` or `merged`.

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check.
