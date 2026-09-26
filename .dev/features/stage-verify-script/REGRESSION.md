# REGRESSION — stage-verify-script (after GATE 2 fix)

- stage: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- base: `1524c6ff90844ee17457ca9450a7abb894a7b1f1` (`git merge-base HEAD origin/main`, as the orchestrator directed)
- head: the working tree of this worktree — the GATE 2 fix, uncommitted, on `14fd386`
- why re-run: the GATE 2 fix changed non-comment code outside the command text (`removeIfPresent` moved into
  `stage-runtime.mjs`, and `stage-regress.mjs` / `stage-verify.mjs` now import it). The build-round run (head on
  `557a513` plus the uncommitted build) was also `no-regressions`; this file and `regression-report.json` now record
  the re-run.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## Partition (`check-regress.mjs scope --feature stage-verify-script`, exit 0)

- **inside:** 40 paths — `git diff --name-only <base>` (40) plus untracked-new (0). The build and review commits
  are now on the branch, so every new file is in the diff. The machine report lists them.
- **declared:** the PLAN's 33 `## Files` paths.
- **escaped:** none. **escape_exempt:** 7 of this feature's own pipeline artifacts, each written by its own stage —
  `GRILL.md`, `PLAN.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`.
- **outside tests:** 106 of the 113 tracked `*.test.mjs` / `*.test.cjs` files. The other seven are inside:
  `command-hygiene.test.mjs`, `render-verify.test.mjs`, `run-gates.test.mjs`, `stage-exit-core.test.mjs`,
  `stage-runtime.test.mjs`, `stage-verify-core.test.mjs`, `stage-verify.test.mjs`. The outside set includes the
  unchanged `stage-regress.test.mjs`, which drives the regress CLI over the fixed removal.
- **outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json` (both confirmed readable at base and head before recording).
- **Style gates ran** (`lint`, `format:check`, `lint:md`): `inside` touches shared style config (`.prettierignore`,
  `.markdownlint-cli2.jsonc`), so the base checkout first ran `npm ci` (exit 0).

## Per-gate exit codes, base → head

| gate                                                                                       | base | head | class |
| ------------------------------------------------------------------------------------------ | ---- | ---- | ----- |
| `tests` (106 outside test files)                                                           | 0    | 0    | ok    |
| `validate`                                                                                 | 0    | 0    | ok    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    | ok    |
| `lint`                                                                                     | 0    | 0    | ok    |
| `format:check`                                                                             | 0    | 0    | ok    |
| `lint:md`                                                                                  | 0    | 0    | ok    |

- `regressions`: none. `pre_existing`: none.
- Verdict: `node pharn/floor/check-regress.mjs verdict <base-results> <head-results> --base <sha> --inside <40 paths>`
  → exit 0, `"no-regressions"`, written verbatim to `regression-report.json` (`cmp` against the checker's stdout →
  exit 0).

## Orchestration notes (ADVISORY)

- The base checkout was `git worktree add --detach .pharn/pharn-dev-regress/base <base>` (exit 0). It was removed
  with `git worktree remove --force` (exit 0) BEFORE the head side ran, so no whole-repo head gate could descend
  into it.
- **Deviation, named (as in the build-round run):** this worktree-isolated session refuses the command's pinned
  `… | xargs node --test` and `$(… | paste …)` shell forms. A node runner under `.pharn/pharn-dev-regress/` passed
  the same lists as argv arrays and recorded exit codes only. The runner's calls were
  `node --test <each outside test>` and `check-regress.mjs scope --changed … --declared … --tests … --eval-pairs …`.
  The `--declared` list came from `plan-files-core.mjs`'s `pathsFromPlanFiles`. `eslint .` does not ignore
  `.pharn/`, so the runner was linted first (exit 0).
- Wall time: base `tests` 105.3 s, head `tests` 106.8 s; `format:check` 30.4 s / 44.3 s; `lint:md` 19.9 s / 8.1 s.

_`/pharn-dev-regress` catches exactly what this suite catches — nothing more, but deterministically. This is not a
claim that nothing broke outside the feature; it is the comparison of the gates above._
