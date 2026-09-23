# REGRESSION — changelog-per-pr

This is iteration 5. Iterations 1–4 also returned `no-regressions`. Iteration 5 re-ran after two changes
that came late:

- **The R7 fix to a pre-existing time-bombed hook test.** `.claude/hooks/require-loop-record.test.cjs` began
  failing on every branch at 2026-09-23T12:00Z, and it is now declared in the plan's `## Files`.
- **The Step-2b promotion of L55.** It wrote `.dev/memory-bank/lessons-learned.md` under
  `/pharn-dev-memory-promote`'s own declared scope, and regenerated `docs/lessons-index.md` by that command's
  Step 6b, which is its declared Bash write (L19).

Those two canon paths were written under the promote command's authority, not the build's, so they were
passed to `scope` in `--declared` alongside the plan's 17 paths — the union of the scopes that authorized
every write. Stated here so the widening is visible.

The hook test moved inside, so the outside test set shrank from 91 to 90. That makes it a different gate
set, so the baseline was re-captured in a fresh detached worktree at the same base SHA; nothing was reused.

- **Base:** `392817f75deed50015ed4074662595514850e6d5`. This is a working-tree dogfood build (the branch has
  no commits yet), so base = HEAD, which is `main` at branch time.
- **Inside (27 paths):**
  - the 17 files declared in PLAN.md `## Files`;
  - the 2 promote-written canon paths;
  - this feature's `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`,
    `verify-report.json`, `REVIEW.md` and `SHIP.md`, all listed in `escape_exempt`.

  `escaped` is empty.

- **Outside:**
  - 90 tracked test files (the iteration-1 set minus the now-inside hook test);
  - 1 eval pair: `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
    `.dev/features/trust-fence/findings.json`. Both paths were confirmed readable before their exit code
    was recorded;
  - `validate` (whole-repo, a named granularity limit).
- **Style gates skipped:** `inside` touches no shared style config (`eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`).
- **Capture:** the HEAD side ran in the working tree, expanding the outside test list with the pinned
  `cat outside-tests.txt | xargs node --test` form.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs`
exit 0; `regression-report.json` is its verdict JSON, byte-identical).

This catches what the suite catches, nothing more. It cannot tell whether the new CHANGELOG rules are the
right rules, or whether the per-PR check behaves on GitHub's runner as it does here. The first is review's
job, and the second is settled only by the CI run on this PR.
