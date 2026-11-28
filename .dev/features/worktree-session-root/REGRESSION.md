# REGRESSION — worktree-session-root (build round 2)

- Base: `6314c1311d22700f7f7cc3bcb4e32dacf654f60e` (HEAD; the working tree held the build's uncommitted files, so
  base = HEAD by Step 1's rule). It already carries both maintainer patches, so this compares the BUILD's files.
- Inside (the changed scope): `.claude/hooks/enforce-writes-scope.test.cjs`, `.claude/hooks/hook-wiring.test.cjs`, `.claude/hooks/protect-trusted-paths.test.cjs`, `.dev/guides/writes-scope.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`, `pharn-install.json`, `pharn/floor/README.md`, `.dev/features/worktree-session-root/GRILL.md`, `.dev/features/worktree-session-root/PLAN.md`.
- Scope check: no escape (`escaped: []`); this feature's `PLAN.md` and `GRILL.md` are exempt by `--feature`.
- Outside gates: 206 test files (per-test reporter), `validate`, and the trust-fence structural eval pair. Style gates
  skipped: no shared style config is inside.

| gate                                                                                     | base | head |
| ---------------------------------------------------------------------------------------- | ---- | ---- |
| tests                                                                                    | 1    | 0    |
| validate                                                                                 | 0    | 0    |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0    | 0    |

- `regressions`: none. `pre_existing`: `tests` — red at base only, so nothing flipped pass→fail.
- Why the base is red (investigated, not waved through): exactly two tests failed there, both manifest checks —

  ```text
  .dev/floor/check-install-manifest.test.mjs  ✧ the real tree is GREEN, through the CLI as CI runs it
  .dev/floor/install-manifest-core.test.mjs   ✧ the work tree's pharn-install.json is the real tree's manifest
  ```

  The base commit holds the patched hooks, `settings.json` and `LIMITS.md` but not yet the regenerated
  `pharn-install.json` (a build file); the build's regeneration turns both green at head.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature. This catches what the outside suite
catches, nothing more. Round 1's regress was stopped before it reported (PLAN.md, "Build round 2").
