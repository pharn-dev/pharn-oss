# VERIFY — gate-exclusion-config

- driver: `.pharn/pharn-dev-verify/run.mjs`, a node runner for Step 1. The isolated worktree refuses the pinned `$?`
  capture form. It records each gate's exit code only. The verdict is `pharn/floor/check-verify.mjs`'s, copied verbatim
  into `verify-report.json`.

## Run 2 — after the GATE-2 review fixes (the standing verdict)

- tree: the branch after merging `origin/main` (`4c4c0c5`, 6.35.1), plus the review fixes R1–R6 (`REVIEW.md`).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

**VERIFIED: floor gates PASS.** `failing_gates`: none.

- `reconcile`: `CLEAN`. It reconciled 12 paths since the review-fix anchor, found 0 escapes, and exempted `PLAN.md` and
  `REVIEW.md`. **Bound, stated:** the baseline was re-anchored at the start of the review-fix phase, after the two
  merges, so the merged files are not judged as this build's writes. It was re-anchored again after the one `## Files`
  amendment (`pharn-plan.md`). Writes before the last anchor are outside this window. All of them went through the
  Write/Edit tools under the two guards, and none went through Bash.
- The non-test `npm run check` gates also pass on this tree: `docs:check`, `check:markers`, `check:badge`,
  `check:changelog` and `check:contributing`. The per-PR `check-changelog-entry.mjs --merge-base origin/main` is GREEN.

## Run 1 — the build (`9eb4a21`), superseded

Every gate above exited 0 there too. `reconcile` was `CLEAN` over 27 paths. The full `npm run check` chain passed: all
ten gates, 4540 tests, 0 failing.

## Verifiers (advisory)

no verifiers registered — floor gates only. (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.)

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
