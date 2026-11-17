# REGRESSION — install-manifest

Second run (2026-11-17), after the revision recorded in `PLAN.md` ("Revision after GATE 2": the `CLAUDE.md` sentence
moved to `.dev/guides/generated-docs.md`). The base side was not re-run: the base commit is unchanged, so its results
(the first run's) still describe it. The head side was re-run on the revised tree; the table below is that run.

- Base: `155d12057815e74769e30e785f007924e273eae3` (`git merge-base HEAD origin/main`; the tree was committed, so not
  `HEAD`).
- Inside (26 paths on the second run, all declared in `PLAN.md` `## Files` or this feature's own stage artifacts):
  `scope` exit 0, no escape; `escape_exempt` = this feature's eight stage artifacts (`PLAN.md`, `GRILL.md`,
  `REGRESSION.md`, `regression-report.json`, `VERIFY.md`, `verify-report.json`, `REVIEW.md`, `SHIP.md`).
- Outside: 197 test files, the `trust-fence` eval pair, `validate`, and the three style gates (run because `inside`
  touches `.prettierignore`, a shared style config). The base checkout used the main checkout's `node_modules` through
  a symlink instead of `npm ci`: `package-lock.json` is identical at base and head, so the devDependencies are the same.

| Gate                                    | Base | Head |
| --------------------------------------- | ---- | ---- |
| `tests` (197 outside files, per test)   | 1    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |
| `lint`                                  | 0    | 0    |
| `format:check`                          | 0    | 0    |
| `lint:md`                               | 0    | 0    |

- `regressions`: none. `pre_existing`: `tests`.
- Per test: base 6912 passed / 1 failed / 1 skipped; head 6913 passed / 0 failed / 1 skipped; `new_failures`: none.
  The base side's one failure, quoted as data:

  ```text
  pharn/floor/entry-gates.test.mjs — CLI cache (AC3): a green clears the slot; a timed-out, a style-only or a peeked red is never recorded
  ```

  It is timing-dependent (its assertion is about a gate the runner records as unmeasured) and the host's load average
  was between 100 and 370 during the base run. It also failed in the first head run, under the same load, and passed in
  this one and when run alone. The feature does not touch `entry-gates` or anything it imports.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

This catches what the outside suite catches, nothing more: it compares exit codes and per-test results at base and
head, and certifies only that comparison, never the feature.
