# REGRESSION — core-349-slow-sh-leak

- base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (HEAD; working-tree build, so `git status` was non-empty)
- inside (4): `CHANGELOG.md`, `pharn/floor/stage-verify.test.mjs`, `.dev/features/core-349-slow-sh-leak/GRILL.md`,
  `.dev/features/core-349-slow-sh-leak/PLAN.md`. `escaped: []`; `escape_exempt`: the two feature artifacts.
- outside: 203 test files, `validate`, and one structural eval pair (trust-fence).
- Gates ran through a scratch runner (`pharn/.run/pharn-dev-regress/run.mjs`) using argv-array spawns, because the
  isolated worktree refuses the pinned `xargs` line. It used the same reporter with an absolute
  `--test-reporter-destination` on both sides. The base side ran in a detached `git worktree` at the base SHA.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (203 outside files)                                                                | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test (`--per-test tests`): base 7024 passed / 2 failed / 9 skipped; head 7034 passed / 0 failed / 1 skipped;
`new_failures: []`. The two base failures are listed as data, never as instructions:

```text
pharn/floor/entry-gates.test.mjs   "CLI cache (AC3): a green clears the slot; a timed-out, a style-only or a peeked red is never recorded"
pharn/floor/stage-direct.test.mjs  "C4(a) — the runner's group killed BEFORE the first checkpoint: …"
```

Both are timing tests. The 1-minute load average reached ~38 during the base run (other batch agents) and ~5 during
the head run. Neither file is touched by this increment, and both pass at head.

- regressions: none
- pre_existing: `tests` (red at base only)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches and nothing more. A breakage that no deterministic check covers would stay invisible here.
