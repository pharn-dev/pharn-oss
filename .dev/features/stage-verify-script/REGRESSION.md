# REGRESSION — stage-verify-script

Each run is kept, newest first. `regression-report.json` holds the newest run's verdict verbatim.

## On final `main` (6.26.0 over 6.25.0)

- stage: regress — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- base: `2e5c2e3183c595c76abadde8878d1fa2e94d115e` — `git merge-base HEAD origin/main`, which the orchestrator named.
  (The command's dirty-tree rule would have picked `HEAD` instead, because the untracked `SHIP.md` draft, a later
  stage's artifact, makes `git status --porcelain` non-empty.)
- head: the working tree on the merge commit `a470b71` (parents `c989084` and `2e5c2e3`), with this stage's
  artifacts and the `SHIP.md` draft the only changes since.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

### Partition (`check-regress.mjs scope --feature stage-verify-script`, exit 0)

- **inside:** 41 paths — `git diff --name-only <base>` (40, this branch's own files) plus untracked-new (1, the
  `SHIP.md` draft). The machine report lists them.
- **declared:** the PLAN's 33 `## Files` paths.
- **escaped:** none. **escape_exempt:** 8 of this feature's own pipeline artifacts — `GRILL.md`, `PLAN.md`,
  `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`, `SHIP.md`.
- **outside tests:** 108 of the 115 tracked `*.test.mjs` / `*.test.cjs` files; the seven inside are this increment's.
  The outside set includes main's `run-marker.test.mjs` and `transcript-core.test.mjs`.
- **outside eval pairs:** 1 — `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json` (both confirmed readable at base and head before recording).
- **Style gates ran** (`lint`, `format:check`, `lint:md`): `inside` touches shared style config (`.prettierignore`,
  `.markdownlint-cli2.jsonc`), so the base checkout first ran `npm ci` (exit 0).

### Per-gate exit codes, base → head

| gate                                                                                       | base | head | class |
| ------------------------------------------------------------------------------------------ | ---- | ---- | ----- |
| `tests` (108 outside test files)                                                           | 0    | 0    | ok    |
| `validate`                                                                                 | 0    | 0    | ok    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    | ok    |
| `lint`                                                                                     | 0    | 0    | ok    |
| `format:check`                                                                             | 0    | 0    | ok    |
| `lint:md`                                                                                  | 0    | 0    | ok    |

- `regressions`: none. `pre_existing`: none.
- Verdict: `node pharn/floor/check-regress.mjs verdict <base-results> <head-results> --base <sha> --inside <41 paths>`
  → exit 0, `"no-regressions"`, written verbatim to `regression-report.json` (`cmp` against the checker's stdout →
  exit 0).

### Orchestration notes (ADVISORY)

- The base checkout was `git worktree add --detach .pharn/pharn-dev-regress/base <base>` (exit 0), removed with
  `git worktree remove --force` (exit 0) BEFORE the head side ran.
- The same named deviation as below: a node runner under `.pharn/pharn-dev-regress/` (linted first, exit 0) passed
  the lists as argv arrays and recorded exit codes only.
- Wall time: base `tests` 157.1 s, head `tests` 123.6 s; `format:check` 57.3 s / 53.7 s; `lint:md` 10.0 s / 8.1 s.
- An intermediate run over the first merge of 3.1 (`c989084`, base `eec6535`) also read `no-regressions`, but its
  records were never committed: they were discarded at the orchestrator's instruction once `main` moved.

## After GATE 2 fix, at 6.24.0 (before the merges)

- base: `1524c6ff90844ee17457ca9450a7abb894a7b1f1` (`git merge-base HEAD origin/main`, as the orchestrator directed);
  head: the GATE 2 fix, uncommitted, on `14fd386`. Re-run because the fix changed non-comment code outside the
  command text (`removeIfPresent` moved into `stage-runtime.mjs`). The build-round run (head on `557a513` plus the
  uncommitted build) was also `no-regressions`.
- **REGRESSIONS: none.** Partition exit 0: inside 40 (all from the diff), declared 33, escaped none, 7 exempt; 106 of
  113 tracked test files outside, including the unchanged `stage-regress.test.mjs`, which drives the regress CLI over
  the fixed removal; one outside eval pair; style gates ran after the base `npm ci` (exit 0).
- Every gate read 0 at base and head (`tests` over 106 files, `validate`, the one `structural:` gate, `lint`,
  `format:check`, `lint:md`); `regressions` and `pre_existing` empty; the verdict exited 0, `"no-regressions"`.
- Wall time: base `tests` 105.3 s, head `tests` 106.8 s; `format:check` 30.4 s / 44.3 s; `lint:md` 19.9 s / 8.1 s.
- A node runner stood in for the command's pinned `xargs` / `$(…)` forms, which this worktree-isolated session
  refuses; it passed the same lists as argv arrays and recorded exit codes only.

_`/pharn-dev-regress` catches exactly what this suite catches — nothing more, but deterministically. This is not a
claim that nothing broke outside the feature; it is the comparison of the gates above._
