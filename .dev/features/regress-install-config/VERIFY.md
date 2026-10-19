# VERIFY — regress-install-config

`verify-report.json` is the round-2 verdict. Both rounds' `FAIL` are on `test` alone, and both were run on a machine
saturated by parallel agent sessions. They are recorded as the verdicts they are, never re-labelled PASS.

## Round 2 (after GATE 2 fixes, merged with origin/main `94ad252b`)

**Verdict (FLOOR, `check-verify.mjs` exit 1): `FAIL`** — `failing_gates: ["test"]`. Every other gate is 0: `validate`,
`lint`, `format:check`, `lint:md`, `structural:…`, and `reconcile` (`CLEAN`, 31 reconciled, 0 escapes).

**The failing `test` gate, investigated (advisory).**

- A diagnostic `npm test` with output captured failed 8 of 5569 tests. Every one is a budget pause (`continue` at a
  budgeted phase) or a wall-clock assertion: five in `entry-base-evidence.test.mjs`, the A3 kill-mid-add and the
  ★ WIRING `npm ci` tests in `stage-regress.test.mjs`, and the old-clock mutant in `stage-verify.test.mjs`. Load
  averages ran 170–220.
- None of the failures is an assertion about this increment's behaviour.
- Re-run alone: `stage-regress.test.mjs` passes in full, and 3 of 174 fail in the other two files, same kinds.
- An A/B of two of those tests, back to back: HEAD 2/2 pass; a clean `origin/main` worktree 0/2 pass under the same
  load.
- Every test this increment added passed in every run.
- CI on an unloaded runner is the measurement that can turn this into a PASS. This file does not.

## Round 1 (after build)

**Verdict (FLOOR, `check-verify.mjs` exit 1): `FAIL`** — `failing_gates: ["test"]`.

| gate                                                                                           | exit |
| ---------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`)                                                                            | 1    |
| `validate`                                                                                     | 0    |
| `lint`                                                                                         | 0    |
| `format:check`                                                                                 | 0    |
| `lint:md`                                                                                      | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`     | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`: `CLEAN`, 19 reconciled, 0 escapes) | 0    |

Verifiers: `{ registered: 0, findings: [] }` — no verifiers registered, floor gates only.

**The failing `test` gate, investigated (advisory).** The gate runner records exit codes only, so the failing test
was not named by this run. The machine was saturated by parallel agent sessions (load average 175 at the time of the
diagnostic below), and the suite holds budget- and wall-clock-sensitive regress tests. One of them,
`entry-base-evidence.test.mjs` "no slot — …", failed the build-step `npm run check` the same way
(`continue` at phase `install`: under the pinned 540000/570000 budget an install starts only while
elapsed ≤ 30 s, and that test ran 96 s) and passes alone. A diagnostic `npm test` immediately after, same tree, with
output captured: **5566 tests, 5565 pass, 0 fail, exit 0**. That diagnostic is NOT this round's verdict; the verdict
stands as `FAIL`, and a fresh verify runs after the GATE 2 fixes.

## Orchestration deviation (ADVISORY)

The pinned `t=$?` / `printf` capture forms are refused in this worktree-isolated session, so Step 1 ran through
`.pharn/pharn-dev-verify/capture.mjs`, which runs the same gate commands with argv arrays and records exit codes only.

"The named gates passed" is the whole content of a PASS; nothing here claims the feature is correct.
