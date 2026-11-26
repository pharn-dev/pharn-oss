# REGRESSION — loop-host-execution-consent (Linear CORE-397)

This report is the run on the tree verify judged last: the build plus the review-nit fix, with `pharn/LIMITS.md` at
main's bytes. The human's LIMITS.md sentence was reverted to land after verify (L68). Earlier runs are under History.

- base: `76188fa152ccca159811848bef3b3ed947ea521f` (HEAD; the working tree held the build, so `base = HEAD`)
- inside (15): the two loop commands, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, `README.md`,
  `SKILLS_VERSION`, `pharn-install.json`, and this feature's stage artifacts (exempt under `--feature`)
- scope: exit 0, no escape outside the plan's `## Files`
- outside: 208 test files, `validate`, one eval pair (trust-fence); no shared style config touched, so the style gates
  were skipped on both sides

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (208 outside files, per-test)                                                      | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 6,893 passed / 0 failed / 7 skipped; head 6,899 passed / 0 failed / 1 skipped; `new_failures: []`.

`regressions: []` · `pre_existing: []`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the outside
suite catches, nothing more. It compares base and head; it does not certify the feature.

## How the gates ran

The pinned lines ran through a runner kept in the session scratchpad, outside the worktree, so no whole-repo gate can
reach it. It uses `spawnSync`, because this isolated worktree session refuses compound git shell lines. The runner
used the command's own forms: the canonical `## Files` extraction, `scope` with `--feature`, a detached base worktree
at the base SHA (removed after), `node --test` with the absolute reporter path and `--test-reporter-destination` per
side (each record removed first), `validate`, `check-structural`, and `verdict --per-test tests`.

## History

- **Run 1** (before review): `no-regressions`, every gate 0. The runner's first launch crashed inside the runner
  before any gate ran and wrote no verdict.
- **Run 2** (after the review-nit fix): stopped mid-run by the orchestrator. The human's `pharn/LIMITS.md` patch
  landed after its `inside` list was taken. It wrote no verdict, and its base worktree was removed.
- **Run 3** (base `a44a772a`, the human's LIMITS.md commit): `no-regressions` with `pre_existing: ["tests"]`. The
  two install-manifest tests were red at base, because that commit held the new LIMITS.md with the old manifest. Head
  was green. That commit was later undone (`git reset --soft`, at the human's choice) after verify run 3's reconcile
  escape.
- **Run 4**: this report.
