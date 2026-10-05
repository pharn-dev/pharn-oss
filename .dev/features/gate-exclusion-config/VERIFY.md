# VERIFY — gate-exclusion-config

- tree: HEAD `9eb4a21` (the build), plus this increment's `REGRESSION.md` and `regression-report.json`.
- driver: `.pharn/pharn-dev-verify/run.mjs`, a node runner for Step 1. The isolated worktree refuses the pinned `$?`
  capture form. It records each gate's exit code only. The verdict is `pharn/floor/check-verify.mjs`'s, copied
  verbatim into `verify-report.json`.

## Floor gates (exit codes)

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

- `reconcile`: `CLEAN`. It reconciled 27 paths since the build's anchor, found 0 escapes, and exempted this
  increment's two regress artifacts. **Bound, stated:** the baseline was re-anchored after each plan amendment (the
  plan's "Grill amendments"), so writes made before the last anchor are outside this window. All of them went through
  the Write/Edit tools under the two guards.
- The same tree also passed the full `npm run check` chain before the build was committed: all ten gates, 4540 tests,
  0 failing.

## Verifiers (advisory)

no verifiers registered — floor gates only. (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.)

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
