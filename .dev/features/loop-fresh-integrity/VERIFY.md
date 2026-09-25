# VERIFY — loop-fresh-integrity

**VERIFIED: floor gates PASS** (final iteration; `check-verify.mjs .pharn/pharn-dev-verify/results.json --feature
loop-fresh-integrity` exit 0, `verify-report.json` `.verdict` = `PASS`, `failing_gates` = `[]`).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — hooks, product-floor and dev-floor suites)                            | 0    |
| `validate` (`pharn/floor/validate.mjs .`)                                                  | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`, run last)             | 0    |

`reconcile` is `CLEAN` with 0 escapes, over the epoch `/pharn-dev-build` anchored after its setter. The build's one
Bash write, to `pharn/floor/check-loop-fresh.mjs` (BUILD.md deviation 1), sits inside the build's anchored scope, so
it is not an escape.

## Final run — post-rebase (the report on disk)

The branch was rebased onto `origin/main` `7bcd7a8` (groups C and A had merged: 6.20.4 and 6.20.5, including the new
`check-verify --ac-gate` precedence). A new reconciliation epoch was anchored after the plan-scope setter, because the
build epoch would read the two groups' upstream files as escapes; the build epoch's own verify, above, ran CLEAN.
Then the full gate set ran twice:

- post-rebase iteration 1: `FAIL ["lint:md"]`. The violation was the agent's own scratch file
  `.pharn/ship-pr/changelog-resolved.md`, a rebase draft (markdownlint's globs reach `.pharn/`). Not part of the
  increment. The scratch was deleted.
- post-rebase iteration 2: **PASS**, all seven gates 0, identical to the table above; `npm run check` exit 0 (3,240
  tests, 0 failing). The differential test's relation now runs against 6.20.4's precedence and holds.

## Iteration 1 — a real FAIL, fixed (recorded, not hidden)

The first run was **`VERIFY FAILS: gate(s) ["lint:md"] red`**. Every other gate was 0. The one violation was in this
feature's own build note: `.dev/features/loop-fresh-integrity/BUILD.md:13`, MD038, a code span with a trailing space
(`RED —` followed by a space). The build had skipped the L13 format pass on its own artifact. The note was
corrected, formatted with the L13 pair, and the FULL gate set was re-run, giving the table above.
`.pharn/pharn-dev-verify/*-iter1.json` keeps the first run.

## Verifiers (ADVISORY)

`count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`: **no verifiers registered — floor gates only.**

## What this does and does not mean

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. The feature-specific signal is the new tests `npm test` collected:

- check-loop-fresh: the moved-tree forgery set in both modes, the AC-only residual, the unit and merge-order pins, the
  differential test over real check-verify runs, and both ★ WIRING additions.
- check-test-stage: the crash tests over a copied floor, and the ✧ closure.

## Orchestration deviation (advisory, stated)

The pinned `$?` capture form is refused in a worktree-isolated session. The gates ran through a node runner,
`.pharn/pharn-dev-verify/run.mjs`, which uses `spawnSync` argv arrays and records exit codes only. It confirmed both
eval-pair paths resolve before running, runs `reconcile` last, and hands the map to `check-verify.mjs`. This run's
tree is the pre-rebase tree (base `137abd3`). The orchestrator's post-rebase re-checks are recorded in SHIP.md.
