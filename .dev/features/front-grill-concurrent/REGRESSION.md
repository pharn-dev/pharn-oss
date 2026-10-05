# REGRESSION — front-grill-concurrent

- **Base:** `d8fd005487420e2bb367ac12bbe07b7642a48dec`, which is `git merge-base HEAD origin/main`. The tree was clean
  after the build commit `093413b`.
- **Inside:** the 18 changed paths listed in `regression-report.json` `.inside`. `scope` reported none of them as
  escaped and none as escape-exempt: every one is declared in the PLAN's `## Files`.
- **Outside gates:** every `*.test.*` not inside (4,322 tests), `validate`, and one structural gate over the
  trust-fence eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- **Style gates skipped:** no shared style config is inside.

## Gates

The base side ran in a detached worktree at the base commit. The head side ran in the working tree.

| gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (4,322 tests)                                                                      | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

- `regressions[]`: none.
- `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature**
(`pharn/floor/check-regress.mjs verdict`, exit 0, `no-regressions`).

This check catches what the suite catches outside the feature, and nothing more. It certifies the base-to-head
comparison, not the feature.
