# REGRESSION — surface-bump-check

- base: `6b49cafdb6c98da52e01fafd72b93b1335021e44` (working tree dirty → `base = HEAD`, which is `origin/main` 6.65.2)
- inside (10): this feature's `PLAN.md` and `GRILL.md`, `.dev/floor/check-surface-bump.mjs`,
  `.dev/floor/check-surface-bump.test.mjs`, `.dev/guides/floor-checks.md`, `.github/workflows/ci.yml`, `CHANGELOG.md`,
  `CLAUDE.md`, `CONTRIBUTING.md`, `package.json`
- declared (`## Files`, via `plan-files-core.mjs`): the same 8 non-artifact paths; `check-regress scope` exit 0, no
  escape; `escape_exempt` = this feature's `GRILL.md` and `PLAN.md` (stage artifacts)
- outside: 164 test files + `validate` + one structural eval pair; style gates skipped (no shared style config inside)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (164 outside test files, `node --test`)                                            |    1 |    1 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- regressions: none
- pre_existing: `tests`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`.)

## The red `tests` gate on both sides — investigated, not just recorded

`tests` was red at BOTH base and head, so the helper classifies it `pre_existing`; that classification can mask a real
flip, so it is looked at here rather than accepted. Counts: base 5651 tests, 5639 pass, **6 fail**; head 5651 tests,
5642 pass, **3 fail**. Fewer failures at head, on byte-identical outside files, is the signature of an environment
effect, not of this increment. Context measured during the run: at least five other agents' `node --test` suites were
running on the same machine, and `pharn/floor/stage-regress.test.mjs` alone took over 40 minutes in the base worktree
(it spawns a full stage per test, and several of its children carry `--timeout-ms 30000`). The base worktree also ran
without `npm ci` (the stage's stdlib-only rule), which this stage accepts for the core gates.

The orchestration did not keep the per-test output of these two runs (an advisory gap in this stage's runner), so the
failing test names are identified at `/pharn-dev-verify`, whose `npm test` log is kept, and recorded in `VERIFY.md`.

Honest residual (P0): this certifies only the comparison of these gates' exit codes at base and head. It catches what
the suite catches, nothing more, and a gate red on both sides hides any flip inside it.
