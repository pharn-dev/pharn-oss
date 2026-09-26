# VERIFY — ship-quick-mode

## VERIFIED: floor gates PASS

## Gate table

| gate                                                                                        | exit |
| ------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test`, hermetic suite incl. the feature's own `*.test.*` — 3402/3402 passing)  | 0    |
| `validate` (`node pharn/floor/validate.mjs .`, structural floor over the product surface)   | 0    |
| `lint` (eslint, whole-repo)                                                                 | 0    |
| `format:check` (prettier, whole-repo)                                                       | 0    |
| `lint:md` (markdownlint, whole-repo)                                                        | 0    |
| `structural:…/expected-injection-comment.json` (the committed trust-fence eval pair)        | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, the fix #7 Bash-write detector) | 0    |

**`failing_gates: []`.**

## Bash-reconciliation detail

`reconcile` came back `CLEAN`: 35 paths reconciled against the `pharn-dev-build` anchor, zero escapes.
Three feature-directory pipeline artifacts were exempted by name (as the contract expects, since they are
written after the build's anchor by the later stages' own scoped writes, not by an out-of-scope Bash
write): `.dev/features/ship-quick-mode/BUILD.md`, `REGRESSION.md`, `regression-report.json`.

**One self-inflicted false alarm, caught and corrected before this table was recorded (documented, not
hidden — matches the same discipline `REGRESSION.md` records for this run's regress stage).** The first
`lint` run reported one error, `'readFileSync' is defined but never used`, in
`.pharn/pharn-dev-regress/run-regress.mjs` — an abandoned scratch script from an earlier, superseded
attempt at the regress stage's baseline capture (before it was replaced by the `git archive`-based
approach `REGRESSION.md` describes). `.pharn/` scratch is gitignored and was never part of this feature's
declared scope, but ESLint has no `.pharn/` exclusion, so the leftover file was visible to the whole-repo
`lint` gate. The three abandoned scratch scripts under `.pharn/pharn-dev-regress/` were deleted (they had
already been superseded and nothing downstream referenced them) and `lint` was re-run clean. No source
file this feature declared was touched by this cleanup.

## Verifiers

**No verifiers registered — floor gates only.** (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`, per `pharn/ARCHITECTURE.md §3.1`'s `role: verifier` membership test.)
Step 2 is a no-op by construction; the verdict above rests entirely on the floor gate table.

## The honest residual (P0/P7)

Verified = the named gates passed; this is **not** a guarantee of correctness beyond what those gates
check — verifier concerns are advisory help, not assurance. With zero verifiers registered, no advisory
annotation exists yet to even carry that caveat in practice; the floor table above is the entire content
of "verified" for this run.
