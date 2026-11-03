# REGRESSION — lesson-heading-parser

- **Base:** `fb997e4bd192ed57dd9ca3240d9866c4c54d9408` (`origin/batch/audit-2026-11-03`, the branch's fork point,
  passed as `--base`: the batch branch, not `origin/main`, is what this branch forks from, so the merge-base with
  `main` would have counted group S's already-integrated changes as this feature's).
- **Inside:** 25 paths (the feature's `## Files` plus its own `PLAN.md` / `GRILL.md`); `escaped: []`;
  `escape_exempt`: `PLAN.md`, `GRILL.md`.
- **Outside gates:** 171 outside test files (per-test reporter), `validate`, and the trust-fence structural pair.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (per test: base 5243 pass / 0 fail / 4 skip; head 5246 pass / 0 fail / 1 skip)     | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []` · `pre_existing: []` · `per_test.new_failures: []` · `check-regress.mjs verdict` exit 0.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
base-vs-head comparison of the gates above: it catches what the outside suite catches, nothing more. The machine
report is `regression-report.json` (the helper's verdict, verbatim). Host load was high during the run (load average
83–143 from parallel batch workers); both sides were green regardless.
