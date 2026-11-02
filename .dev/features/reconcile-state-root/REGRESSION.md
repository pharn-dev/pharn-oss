# REGRESSION — reconcile-state-root (run 2)

**Base:** `0b18864b27f1f0cf6cb85e240b8f1a3fb8359281` (HEAD after the fast-forward onto the sibling fix; the working tree is
dirty, so the dogfood rule applies). The baseline ran in a detached worktree at that commit, outside the repo. Run 1's
base was `607d82c2`. The re-anchor between the two runs is recorded in `SHIP.md` § Re-anchor record.

## Partition

- **Inside (19):** the 11 modified files in the plan's `## Files`, `HUMAN-PATCH.md`, and this feature's own pipeline
  artifacts.
- **Scope check:** `check-regress.mjs scope` exited 0, `escaped: []`. `escape_exempt` lists this feature's `GRILL.md`,
  `PLAN.md`, `REGRESSION.md`, `SHIP.md`, `VERIFY.md`, `regression-report.json` and `verify-report.json`.
- **Outside gates:** 175 test files, `validate`, and one structural eval pair (trust-fence). There is no style gate,
  because `inside` touches no shared style config.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (175 outside files, per-test reporter)                                             | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test, base → head: passed 6002 → 6007, failed 0 → 0, skipped 6 → 1. `new_failures`: none.

- `regressions`: none
- `pre_existing`: none

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

This catches what the suite catches, nothing more. A regression that no test, rule or eval covers is invisible here.
