# REGRESSION — loop-driver-spike

- **Base:** `155d12057815e74769e30e785f007924e273eae3` — `git merge-base HEAD origin/main`. The working tree was
  clean, with every change committed on the branch, and `origin/main` had not moved after a fetch.
- **Inside** (what the increment changed, `git diff --name-only <base>`): the 13 `## Files` paths, plus this feature's
  own `PLAN.md` and `GRILL.md`. `check-regress.mjs scope --feature loop-driver-spike` exited 0 with `escaped: []` and
  `escape_exempt: [PLAN.md, GRILL.md]`.
- **Outside gates:**
  - 197 test files, run through `.dev/floor/node-test-results-reporter.mjs` on each side;
  - `validate`;
  - the one committed eval pair (`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
    ↔ `.dev/features/trust-fence/findings.json`).

  The style gates were skipped because no shared style config changed. The base side ran in a detached worktree at
  the base and was removed afterwards. The head side ran in this worktree.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- **Per-test results:**
  - base: 6,905 passed, 0 failed, 9 skipped;
  - head: 6,906 passed, 0 failed, 8 skipped;
  - `new_failures: []`.
- **Regressions:** none. **Pre-existing:** none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** That is
`check-regress.mjs verdict`, exit 0, `"verdict": "no-regressions"` (`regression-report.json`, verbatim). It catches
what this suite catches and nothing more. The increment's own test (`loop-driver.test.mjs`) is inside, so this stage
does not run it; `/pharn-dev-verify`'s `npm test` does.
