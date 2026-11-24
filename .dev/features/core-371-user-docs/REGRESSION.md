# REGRESSION — core-371-user-docs

- base: `cd778d7c6616072ba77a7d119abf14b8b1800af7` (HEAD of a dirty tree, Step 1.1 — the commit carrying the plan,
  GATE 1 record and grill log, on top of the merge of `origin/main` 9c438685)
- inside (9): the nine `## Files` paths; `scope` exit 0, no escape, `escape_exempt` empty (this feature's `PLAN.md` and
  `GRILL.md` are committed, so they are not in the diff)
- outside: 206 test files, `validate`, and one eval pair (`trust-fence` expected ↔ `.dev/features/trust-fence/findings.json`).
  Style gates skipped: no shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 7124 passed, 0 failed, 9 skipped; head 7132 passed, 0 failed, 1 skipped; `new_failures: []`.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature (`check-regress.mjs verdict`,
`no-regressions`).

This catches what the outside suite catches, nothing more.

Orchestration note (advisory): the pinned `xargs` / `$?` / `git worktree add` shell forms are refused in this
worktree-isolated session, so Steps 1–3 ran from a scratch runner, `pharn/.run/pharn-dev-regress/capture.mjs`
(gitignored, deleted after use). It ran the same commands with `spawnSync` argv arrays: the `scope` line with
`--feature core-371-user-docs`, the pinned per-test reporter with an absolute path on both sides, `validate` and
`check-structural.mjs` in a detached base worktree and at HEAD, and the `verdict` line with `--per-test tests`.
`regression-report.json` is that verdict's stdout, copied verbatim.
