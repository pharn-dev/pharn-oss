# REGRESSION — crash-routing

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`pharn/floor/check-regress.mjs verdict` exit 0, `verdict: "no-regressions"` (`regression-report.json`, verbatim).

## Base and partition

- **Base:** `cf9089763b5b68d820858117b7f79faecc32cb23` (HEAD; the working tree carries the build, so the dirty-tree rule
  picks HEAD).
- **Inside:** 27 paths (`git diff --name-only HEAD` plus untracked), listed in the report. `check-regress.mjs scope`
  with `--declared` = the plan's 25 `## Files` paths and `--feature crash-routing`: **escaped `[]`**; `escape_exempt`
  is this feature's own `PLAN.md` and `GRILL.md`.
- **Outside:** 97 test files, and one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before its exit code was recorded).
- **Style gates skipped** by the deterministic rule: `inside` touches no shared style config (`eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), so an outside style flip is impossible. They run
  whole-repo at `/pharn-dev-verify`.

## Gates, base → head

| gate                    | base | head |
| ----------------------- | ---- | ---- |
| `tests` (97 files)      | 0    | 0    |
| `validate`              | 0    | 0    |
| `structural:<expected>` | 0    | 0    |

`tests` ran 2,917 tests at base and 2,917 at head, all passing, through the pinned
`cat outside-tests.txt | xargs node --test` form. The base ran in a detached `git worktree` at the base SHA with
`node_modules` symlinked in, removed afterwards (`git worktree list` shows no leftover).

`regressions: []`, `pre_existing: []`.

## Iteration 2 (after the review fixes) — the standing verdict

The seven review findings were fixed inside the plan's `## Files` (REVIEW.md, dispositions), and this stage was re-run
over the fixed tree with the same base and the same gate set: `scope` → escaped `[]`, 97 outside test files; `tests`
2,917 / 2,917 at base and at head, `validate` 0 / 0, `structural:<expected>` 0 / 0. **Verdict: `no-regressions`**,
exit 0. `regression-report.json` is now that run's verdict JSON verbatim (copied with `cp` and compared with `cmp`);
its `inside` list has 31 paths, the four stage artifacts written since iteration 1 included.

## Orchestration notes (advisory)

- The regress scope setter was followed by `reconcile-baseline.mjs --amend-scope` (amendment 2). This command does not
  prescribe it; it records `regression-report.json` on the open epoch, a pipeline artifact the reconciler exempts
  anyway, so it changes no verdict.
- The capture ran as one background Bash command; its final `git worktree list | grep -c base` printed `0` and exited
  1 (no leftover worktree). That exit belongs to the check, not to any gate.

_Residual (P0): `/pharn-dev-regress` catches exactly what its suite catches, nothing more. This verdict certifies the
exit-code comparison above, not that nothing broke._
