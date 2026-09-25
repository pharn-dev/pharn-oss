# VERIFY — neutral-test-results

**VERIFIED: floor gates PASS.** This is the verdict of `pharn/floor/check-verify.mjs` over the gate map below
(`"PASS"`, exit 0, `failing_gates: []`), recorded in `verify-report.json`.

**Re-run after the GATE 2 fix round.** The human chose "fix, then commit + PR" at GATE 2, and the review's fixes were
applied inside the plan's `## Files`. That included `pharn/floor/gate-run-core.mjs`, added there, with the open
reconciliation epoch's scope amended to match (`reconcile-baseline.mjs --amend-scope`, amendment 1). Every gate was
then re-run over the fixed tree, and this file and `verify-report.json` record that second run. The first run was
also PASS: 3335 tests, 18 reconciled paths.

## Floor layer — gate → exit code

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 3336 tests, 3334 pass, 0 fail, 2 skipped — see below)                  | 0    |
| `validate` (`FLOOR: GREEN — 36 capabilities`)                                              | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`: `CLEAN`)                       | 0    |

- **`reconcile`:** CLEAN. 19 changed paths were reconciled against the build's anchored scope as amended, with no
  escapes. Six pipeline artifacts were exempted by name: this feature's `PLAN.md`, `REGRESSION.md`, `REVIEW.md`,
  `VERIFY.md`, `regression-report.json` and `verify-report.json`. That covers the build's Bash writes: the six captured fixtures and `SKILLS_VERSION`,
  all declared in `## Files`, and the scoped formatter passes. A CLEAN means no escape was detected, never that
  none occurred (`reconciliation-record.md`).
- **The two skipped tests.** Both skip themselves with "dev toolchain not installed". This worktree has no local
  `node_modules`, and the tests look for the binaries there. They are
  `.dev/floor/capability-catalog-core.test.mjs`'s "a spliced README passes the repo's prettier and markdownlint
  unchanged", and `.dev/floor/command-hygiene.test.mjs`'s `--no-globs` premise. The README is one of this
  increment's files, so I ran both files with `node_modules` linked for the run and removed it afterwards: 194/194
  pass, 0 skipped. That extra run is advisory evidence and not part of the gate map. CI installs the toolchain and
  runs them.

## Advisory layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`: no verifiers registered, floor gates
only.

## How the gates ran (ADVISORY orchestration)

The session is worktree-isolated, and its guard refuses the command's pinned `$?` / `printf` capture. A disposable
Node runner (`.pharn/pharn-dev-verify/run.mjs`, lint-checked before it ran, deleted after this stage) ran each gate
as an argv array. It recorded every exit code from `spawnSync`'s status into `results.json`, then ran
`check-verify.mjs` over that map. No exit code was typed.

## The honest residual

Verified means the named gates passed. It is NOT a guarantee of correctness beyond what those gates check.
Verifier concerns would be advisory help, not assurance, and none are registered.
