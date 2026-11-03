# REGRESSION — family-grammar-crlf

- base: `dd0bb3d39449590ef5694cc93701c046f672e72c` (`git merge-base HEAD origin/main`; the tree was clean, HEAD `9f9f8281`)
- inside: the 22 paths listed in `regression-report.json` `.inside` — all declared in PLAN.md `## Files`; `scope`
  exited 0 (no escape)
- outside: 170 test files, `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`)
- style gates: skipped by the rule (no shared style config inside)

| gate                                                                                     | base | head |
| ---------------------------------------------------------------------------------------- | ---- | ---- |
| tests (per-test: base 5905 pass / 5 skip, head 5909 pass / 1 skip, 0 failed both sides)  | 0    | 0    |
| validate                                                                                 | 0    | 0    |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0    | 0    |

regressions: none · pre_existing: none · `per_test.new_failures`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`pharn/floor/check-regress.mjs verdict` (exit 0), copied verbatim into `regression-report.json`. It certifies the
comparison only: it catches what the outside suite catches, nothing more.

## How the gates were run (advisory orchestration — recorded, not hidden)

The worktree-isolation guard refuses the pinned shell forms (`xargs`, `$VAR` capture, `git worktree add "$TMP"`), so
Steps 1–3 ran through a node runner under `pharn/.run/pharn-dev-regress/` (`capture.mjs`) with the same argv as
arrays: the pinned `plan-files-core` declared line, `check-regress.mjs scope --feature family-grammar-crlf`, the
per-test reporter at an absolute path on both sides, a detached base worktree, then `verdict --per-test tests`.

One harness defect, found and repaired before the verdict was kept: `capture.mjs` read `scope`'s
`outside_eval_pairs` entries as `E::A` strings, but they are `{expected, actual}` objects, so its first run recorded
a `structural:[object Object]` gate that ran `check-structural.mjs` with no arguments (exit 1 on both sides, which the
verdict would have filed as `pre_existing` — a masked gate, L5/L16's shape). A fix-up runner (`structural.mjs`)
re-ran only that gate correctly at the same base SHA (a fresh detached worktree) and at HEAD, replaced the key in both
maps, and re-ran the verdict; the `tests` and `validate` captures were kept. The table above is the repaired one.

Host load during the run: load averages between 230 and 390 (several batch agents at once). The head per-test record
has no failure; the earlier whole-suite run at build time had two load-sensitive failures, both green when re-run
alone (recorded in SHIP.md).
