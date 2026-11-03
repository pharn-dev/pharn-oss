# REGRESSION — plan-scope-hardening

- Base: `dd0bb3d39449590ef5694cc93701c046f672e72c` = `git merge-base HEAD origin/main` (the batch base; the worktree
  was clean at HEAD `c1027aa3`, so the base is the fork point, never a dirty-tree `HEAD`)
- HEAD: `c1027aa3` (branch `fix/plan-scope-hardening`)
- Verdict source: `pharn/floor/check-regress.mjs verdict ... --per-test tests` (deterministic; exit `0`)
- Machine report: `regression-report.json` (the helper's stdout, verbatim — `cmp` against the captured stdout: equal)

## Inside / outside partition (deterministic; `check-regress.mjs scope`)

- **Inside** (24 paths): `git diff --name-only <base>` plus untracked files, listed in `regression-report.json`
  `.inside`. `scope` reported `escaped: []` against the PLAN's `## Files` (read by `pathsFromPlanFiles`);
  `escape_exempt` = this feature's own `GRILL.md` and `PLAN.md` (pipeline artifacts).
- **Outside gates run** (the same commands at base and head): `tests` (173 outside test files, through the pinned
  per-test reporter), `validate`, `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  (↔ `.dev/features/trust-fence/findings.json`, the one committed pair, outside the feature), and the three style
  gates `lint` / `format:check` / `lint:md` — run because `inside` touches the shared style config
  (`.prettierignore`, `.markdownlint-cli2.jsonc`).

## Per-gate exit codes (base → head)

| Gate                            | base | head | result |
| ------------------------------- | ---- | ---- | ------ |
| tests (173 outside files)       | 0    | 0    | OK     |
| validate                        | 0    | 0    | OK     |
| structural:trust-fence (1 pair) | 0    | 0    | OK     |
| lint                            | 0    | 0    | OK     |
| format:check                    | 0    | 0    | OK     |
| lint:md                         | 0    | 0    | OK     |

Per-test (`per_test`): base 5485 passed / 0 failed / 1 skipped / 0 suite errors; head 5485 / 0 / 1 / 0;
`new_failures: []`, `still_failing: 0`.

- `regressions[]`: none
- `pre_existing[]`: none

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

Honest residual (P0/P7): `/pharn-dev-regress` catches exactly what its suite catches — nothing more. A regression that
no deterministic check covers is invisible here. The claim is "deterministically-detectable breakage outside the
feature is caught," **not** "nothing broke," and it certifies only the comparison, not the feature.

## How the baseline was produced (surfaced for the human, not a verdict input)

- The baseline checkout is a **`git clone` detached at the base SHA** (with `npm ci`), in the session scratchpad,
  instead of the command's `git worktree add`: this agent runs in an isolated worktree whose guard refuses
  `git worktree add` to a path outside it. The clone holds the same committed tree at the same SHA; ignored and
  untracked files of this worktree are absent from it, exactly as from a fresh worktree.
- The Step 1–2 lines were run through small node runners holding the pinned program text and argv (the guard also
  refuses the pinned shell forms typed directly); the runners pass the same arguments, and the per-test reporter is
  the working tree's `.dev/floor/node-test-results-reporter.mjs` on both sides, as the command pins.
- Host load: five other worktrees ran `stage-regress.test.mjs` concurrently; each side took about 37 minutes and no
  test failed on either side.
