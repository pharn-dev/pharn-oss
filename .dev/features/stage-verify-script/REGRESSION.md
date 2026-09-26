# REGRESSION — stage-verify-script

- stage: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- base: `1524c6ff90844ee17457ca9450a7abb894a7b1f1` (`git merge-base HEAD origin/main`, as the orchestrator directed)
- head: the working tree of this worktree (the build, uncommitted, on `557a513`)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## Partition (`check-regress.mjs scope --feature stage-verify-script`, exit 0)

- **inside:** 35 paths — `git diff --name-only <base>` (26) plus untracked-new (9). The machine report lists them.
- **declared:** the PLAN's 33 `## Files` paths.
- **escaped:** none. **escape_exempt:** `.dev/features/stage-verify-script/GRILL.md` and `PLAN.md` (this feature's
  own pipeline artifacts, each written by its own stage).
- **outside tests:** 106 of the 109 tracked `*.test.mjs` / `*.test.cjs` files (the other three are inside:
  `command-hygiene.test.mjs`, `run-gates.test.mjs`, `stage-exit-core.test.mjs`).
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
- Verdict: `node pharn/floor/check-regress.mjs verdict <base-results> <head-results> --base <sha> --inside <35 paths>`
  → exit 0, `"no-regressions"`, written verbatim to `regression-report.json` (`cmp` against the checker's stdout →
  exit 0).

## Orchestration notes (ADVISORY)

- The base checkout was `git worktree add --detach .pharn/pharn-dev-regress/base <base>` (exit 0), removed with
  `git worktree remove --force` (exit 0) BEFORE the head side ran, so no whole-repo head gate could descend into it.
- **Deviation, named:** this worktree-isolated session refuses the command's pinned `… | xargs node --test` and
  `$(… | paste …)` shell forms. A node runner under `.pharn/pharn-dev-regress/` passed the same lists as argv arrays
  (`node --test <each outside test>`, `check-regress.mjs scope --changed … --declared … --tests … --eval-pairs …`),
  recording exit codes only. `eslint .` does not ignore `.pharn/`, so the runner was linted first (exit 0) and the
  one-off partition runner was deleted before the head side ran.
- Wall time: base `tests` 97.3 s, head `tests` 105.6 s; `format:check` 16.8 s / 28.1 s.

_`/pharn-dev-regress` catches exactly what this suite catches — nothing more, but deterministically. This is not a
claim that nothing broke outside the feature; it is the comparison of the gates above._
