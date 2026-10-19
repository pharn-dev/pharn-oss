# VERIFY — subagent-per-lens-sweep

**VERIFIED: floor gates PASS**, in both runs. `verify-report.json` now records the **fix round 1** run (see
`## Fix round 1 (GATE 2)` at the end); its bytes equal run 1's, because the gate set and every exit are the same.

## Run 1

`node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature subagent-per-lens-sweep` exit 0,
`"verdict": "PASS"`, `failing_gates: []`. `verify-report.json` is its stdout with the advisory `verifiers` block merged
in. Run at HEAD `efe53830` (the build commit `5c1a9035` plus the regress artifacts).

## Gates

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5546 tests, 5545 pass, 0 fail, 1 skipped, 427 s)                       | 0    |
| `validate` (`node pharn/floor/validate.mjs .`: GREEN, 37 capabilities)                     | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

The structural gate's pair (`…/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`) was
checked readable before its exit was recorded.

## Reconcile

`CLEAN`. Epoch `2026-10-19T08:43:01.865Z`, anchored by `pharn-dev-build` (after the setter, with the plan's 26-path
scope). 26 paths reconciled, `escapes: []`, `merged: []`, `warnings: []`. `exempted` lists this feature's
`REGRESSION.md` and `regression-report.json`, each written by its own stage under that stage's scope. The three trusted
docs the maintainer patched were committed in `125ff0fe`, before the anchor, so they are outside the window. A `CLEAN`
means no escape was detected, never that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).

## Verifiers (advisory)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

## Outside the verdict (recorded, gates nothing here)

- `npm run check:changelog-entry` (after `git fetch --no-tags origin main`; `origin/main` is still `c47707e`): exit 0,
  GREEN, one new entry, the PR opens `## [6.64.2] - 2026-10-19`, no merged entry or released heading changed.
- `npm run check:changelog` exit 0 and `npm run check:badge` exit 0 (both are also inside `npm run check`).

## Orchestration (advisory)

**Deviation:** this worktree-isolated agent's shell guard refuses the pinned block's `t=$?` / `printf` variable
captures. Each gate therefore ran as its own plain command with `echo "<gate>=$?"`, `npm test` in the background with
its exit written to `.pharn/pharn-dev-verify/test.exit`, and the `{gate: exit}` map was written to
`.pharn/pharn-dev-verify/results.json` with the Write tool from those recorded exits. The commands themselves are the
pinned ones. No scratch script sat under `.pharn/` while `lint` ran.

## Fix round 1 (GATE 2)

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit 0, `"verdict": "PASS"`, `failing_gates: []`, run at HEAD
`0e26688d` (the fix-round build `09744eb0` plus its regress artifacts).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5546 tests, 5545 pass, 0 fail, 1 skipped, 546 s)                       | 0    |
| `validate` (GREEN, 37 capabilities)                                                        | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`--require-baseline`)                                                         | 0    |

- **Reconcile:** `CLEAN`. The epoch is the fix round's own anchor, `2026-10-19T09:36:26.676Z`, by `pharn-dev-build`,
  taken after the setter scoped the amended plan's 28 paths. 3 paths were reconciled, with `escapes: []`,
  `merged: []` and `warnings: []`. `exempted` lists this feature's `REGRESSION.md` and `regression-report.json`. The
  two paths added to `## Files` were in that anchored snapshot, so neither reads as `plan-widened-after-anchor`.
- **Verifiers:** none registered, so the verdict rests on the floor gates only.
- **Outside the verdict:** `origin/main` was re-fetched and is still `c47707e`. `npm run check:changelog-entry` exit 0
  (GREEN). `check:changelog`, `check:badge` and `docs:check` each exit 0.
- **Orchestration:** the same deviation as run 1. Each gate ran as its own plain command with its exit echoed, and the
  map was written with the Write tool.

Honest residual: verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. No gate reads the sentences this increment edits, so whether they are true stays advisory, and verifier concerns
are advisory help, not assurance.
