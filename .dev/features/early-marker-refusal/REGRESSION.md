# REGRESSION — early-marker-refusal

- base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (working tree dirty → `base = HEAD`)
- inside (14): the 12 `## Files` paths changed by the build plus this feature's `PLAN.md` / `GRILL.md`
  (`escape_exempt`); `escaped: []`.
- outside: 202 test files, `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Style gates skipped: no shared style config is inside.
- How it ran: a scratch node runner under `pharn/.run/` (argv arrays, per the worktree isolation), with the pinned
  per-test reporter by absolute path on both sides; the base side in a detached `git worktree` at the base SHA.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 6672 passed / 0 failed / 7 skipped; head 6678 passed / 0 failed / 1 skipped; `new_failures: []`.

`regressions: []` · `pre_existing: []` · `check-regress.mjs verdict` exit 0.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more.
