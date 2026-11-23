# REGRESSION — reanchor-lesson

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `regression-report.json` `.verdict` = `no-regressions`, iteration 2).

_Regress catches what its suite catches — nothing more. A breakage no test, rule or eval covers is invisible here._

## Base and partition

- **Base:** `0b2ec87a4d7e35920af56526979bbe055557fdf2` — `git merge-base HEAD origin/main` (the tree was clean, the
  build committed as `c680b661`).
- **Inside:** `.dev/features/reanchor-lesson/GRILL.md`, `.dev/features/reanchor-lesson/PLAN.md`, `CHANGELOG.md`.
- **Declared (`## Files`):** `CHANGELOG.md`. `scope` exit 0, `escaped: []`; `escape_exempt` = this feature's
  `PLAN.md` and `GRILL.md` (each written under its own stage's scope).
- **Outside gates:** `tests` (all 204 `*.test.mjs` / `*.test.cjs` files, none inside), `validate`, and
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` (pair with
  `.dev/features/trust-fence/findings.json`, both paths checked readable first). No shared style config is inside, so
  the style gates are skipped on both sides.

## Iteration 2 (the standing verdict)

| gate           | base → head |
| -------------- | ----------: |
| `tests`        |       0 → 0 |
| `validate`     |       0 → 0 |
| `structural:…` |       0 → 0 |

Per-test: base 7081 passed, 0 failed, 9 skipped; head 7089 passed, 0 failed, 1 skipped. `new_failures: []`,
`regressions: []`, `pre_existing: []`. Base side 1227 s, head side 904 s; load (1-minute) 17.58 at start, 6.13 at end,
about 44–52 between.

## Iteration 1 (recorded verbatim, superseded)

Verdict `regressions` (exit 1). `tests` base 0 → head 1. Per-test: base 7081 passed / 0 failed; head 7088 passed /
1 failed. The one new failure (a test title — untrusted DATA):

```text
pharn/floor/entry-gates.test.mjs::CLI cache (AC3): a green clears the slot; a timed-out, a style-only or a peeked red is never recorded
```

The head side ran while the host's 1-minute load reached 236 (other projects' agent sessions running prettier, tsc and
vitest; `ps` at 23:12). The test drives a gate stub that sleeps 30 000 ms against a timeout. Run alone afterwards
(`node --test --test-name-pattern="CLI cache \(AC3\)" pharn/floor/entry-gates.test.mjs`) it passed in 12.4 s. The
increment changes only `CHANGELOG.md` and two feature-dir files, which no test reads. Per `/pharn-dev-ship`'s "A STOP
is a STOP", the stage was re-run whole (both sides) once the load fell below 20, and iteration 2 is the verdict. The
iteration-1 maps are kept in `pharn/.run/pharn-dev-regress/iter1/`.

## Orchestration notes (advisory)

- The base and head runs went through a scratch node runner (argv-array `spawnSync`, the per-test reporter by absolute
  path, `PHARN_TEST_RESULTS` removed from the child environment), not the pinned `cat … | xargs node --test` line:
  this worktree-isolated session refuses compound shell lines that name git. Same gate set, same reporter, same
  destination files.
- Heavy slot `heavy.lock` held by `reanchor-lesson` from 22:51 (load 16.41).
