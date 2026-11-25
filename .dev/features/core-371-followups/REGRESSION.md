# REGRESSION — core-371-followups

- Base: `237880cd18448d87bdab3c54f27316d036248398` (`base = HEAD`: a working-tree build, `git status --porcelain`
  non-empty). HEAD at that point held the merge of `origin/main` (60829452), the two human-applied patches, and the
  `pharn-install.json` regeneration, all committed before build Step 0's anchor.
- Inside (9 paths, all declared in `## Files`; `scope` exit 0, `escaped: []`, `escape_exempt: []`):
  `.claude/commands/pharn-grill.md`, `.claude/commands/pharn-review.md`,
  `.claude/hooks/protect-trusted-paths.test.cjs`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, `README.md`,
  `SKILLS_VERSION`, `pharn-install.json`, `pharn/floor/check-regress.mjs`.
- Outside: 204 of 206 test files, `validate`, and the one committed eval pair (trust-fence
  `expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`, both paths checked readable).
  Style gates were skipped: no shared style config is inside.
- Capture: a node runner with argv arrays, because this isolated worktree refuses the pinned `xargs`/`$VAR` shell
  forms. It ran the same `node --test --test-reporter=<abs>/.dev/floor/node-test-results-reporter.mjs
--test-reporter-destination=<abs>/pharn/.run/pharn-dev-regress/<side>-tests.json <outside tests>` gate set in a
  detached base worktree (589 s), then in the working tree (581 s).

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test (`--per-test tests`): base 6553 passed / 0 failed / 7 skipped; head 6559 passed / 0 failed / 1 skipped;
`new_failures: []`, `still_failing: 0`, suite errors 0 on both sides.

`regressions: []`, `pre_existing: []`. `check-regress.mjs verdict` exit 0.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This verdict catches what the outside suite catches, nothing more. It compares exit codes and per-test records at base
and head, and it does not certify the increment as a whole.
