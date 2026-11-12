# REGRESSION — inline-fallback-stop

- base: `61deb6b168c90bfd163a58d3c04e638ad873f516` (`origin/main` 7.10.3; the working tree was dirty, so base = HEAD)
- inside: the 14 declared `## Files` paths plus this feature's `PLAN.md`, `GRILL.md` and `BUILD.md` (exempted by
  `--feature`, listed in `escape_exempt`); `escaped: []`
- outside: 183 test files, `validate`, and the one committed eval pair (trust-fence)
- style gates: skipped on both sides (no shared style config is inside)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (183 outside files, per-test reporter)                                             |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,031 passed, 0 failed, 7 skipped; head 6,037 passed, 0 failed, 1 skipped; `new_failures: []`.

`regressions: []` · `pre_existing: []`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the outside
suite catches, nothing more.

How the gates were run: the Step 1–3 lines through a Node runner in the session scratchpad, because this worktree's
isolation refuses compound shell forms that name `git` (`git ls-files … | paste`, `git worktree add` inside a pipeline).
The runner passes the same arguments the pinned lines pass: the outside test list goes to `node --test` as argv (no
shell word splitting, so neither recorded wrong form), with the absolute reporter path and destination on both sides;
the base side ran in a detached `git worktree` at the base SHA, removed afterwards. The verdict is
`check-regress.mjs verdict`'s stdout, copied verbatim into `regression-report.json` (byte-compared).
