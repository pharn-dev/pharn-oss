# REGRESSION — core-344-no-change-criteria

- base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (the working tree was dirty, so base = HEAD = `origin/main`)
- inside (11): the 7 product files, `SKILLS_VERSION`, `CHANGELOG.md`, and this feature's `PLAN.md` and `GRILL.md`
  (both `escape_exempt`); `escaped: []`
- outside gates: `tests` (204 test files, per-test records), `validate`, and the one committed eval pair
  `structural:…/expected-injection-comment.json`. The style gates were skipped: no shared style config is inside.
- How the gates ran: the isolated worktree refuses the pinned `xargs` line, so a scratch node runner
  (`spawnSync` argv arrays) ran the same command. It passed the same files as one argv list, with the absolute
  per-test reporter and destination in the working tree; the base ran in a detached `git worktree`, which was removed
  afterwards.

| gate                    | base | head |
| ----------------------- | ---- | ---- |
| `tests`                 | 0    | 1    |
| `validate`              | 0    | 0    |
| `structural:…injection` | 0    | 0    |

Per-test (`tests`): base 7081 passed, 0 failed; head 7086 passed, 3 failed. The new failures are test ids, quoted as
DATA:

```text
.dev/floor/check-install-manifest.test.mjs::✧ the real tree is GREEN, through the CLI as CI runs it
.dev/floor/check-version-badge.test.mjs::the checker is GREEN against this repo
.dev/floor/install-manifest-core.test.mjs::✧ the work tree's pharn-install.json is the real tree's manifest (the docs:check verdict, inside npm test too)
```

**REGRESSIONS: 1 outside the feature — stage FAILS** (`regressions: ["tests"]`, verdict `regressions`).

Cause, read live from the two checkers: the build bumped `SKILLS_VERSION` to 7.23.1 and changed shipped files, but
it did not update the README version badge (`check-version-badge.mjs`: "the badge reads 7.23.0") or regenerate
`pharn-install.json` (`check-install-manifest.mjs`: DRIFT, "regenerate and commit — npm run docs:generate"). Neither
file is in the PLAN's `## Files`, because the plan said wrongly that no generated artifact changes. These are not
load failures. They are real, deterministic breakages that every bump carries.

Residual: this comparison catches what the outside suite catches, nothing more.
