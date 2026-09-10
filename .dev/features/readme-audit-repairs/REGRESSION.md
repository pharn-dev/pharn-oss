# REGRESSION — readme-audit-repairs

**Base:** `4bd1b0c3269504ee55060b2a74ca8f1eca68de23` · **Head:** `4375b299379ae58332ff6a53aa4931237b6c41b3`

## Run history — this stage ran twice, and the first attempt is kept on purpose

**Attempt 1 STOPPED before the verdict.** `check-regress.mjs scope` exited **1** with a blocking fix #7
escape finding naming `.dev/features/claude-dir-scan-exclusion/PLAN.md` — **another agent session's
artifact**, written into the same working tree at 10:38:21 while this run was in flight (different
increment, different `applied_lessons`; this build's writes-scope was `['README.md']` throughout, under a
guard that had already fired on this session's own `GRILL.md` write). No verdict was computed and
`regression-report.json` was deliberately not written.

**Attempt 2 (this one) removed the cause structurally, not by filtering.** The increment was committed to
`docs/readme-audit-repairs` (`4375b29`) and the stage re-run from an **isolated detached worktree** at that
commit — a checkout with `0` untracked files, so the other session's in-progress work is absent from
`git ls-files --others` by construction. Nothing of theirs was moved, ignored, or deleted, and the
checker's inputs were **not** hand-edited: `.dev/memory-bank/lessons-learned.md` **L17** and **L20** are
precisely about not excluding paths by hand to make this check pass. `scope` then returned
`escaped: []` on its own.

The first attempt is recorded rather than overwritten because it found something real: `scope` derives
`escaped` from `git diff <base>`, which answers _what changed_, not _what this build wrote_. `--feature`
closes that gap for a feature's own artifacts; **a second agent session sharing the working tree is the
same gap in a case `--feature` does not cover.** That is carried as a lesson candidate, not discarded.

## Partition

| classification          | paths                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| inside, declared        | `README.md`                                                          |
| inside, `escape_exempt` | this feature's own `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `SHIP.md` |
| **`escaped`**           | **none**                                                             |
| outside gates run       | 72 test files, `validate`, 1 committed eval pair                     |

## Per-gate comparison

| gate                                    | base | head | result |
| --------------------------------------- | ---- | ---- | ------ |
| `tests` (72 outside test files)         | 0    | 0    | stable |
| `validate`                              | 0    | 0    | stable |
| `structural:expected-injection-comment` | 0    | 0    | stable |

`regressions[]`: **empty** · `pre_existing[]`: **empty**

**Style gates were skipped by the deterministic config-touch rule**, and their absence is from **both**
maps, not one: `inside` touches no shared style config (`eslint.config.mjs`, `.prettierrc.json`,
`.prettierignore`, `.markdownlint-cli2.jsonc`), so over byte-identical outside files a style flip is
provably impossible. This also avoided an `npm ci` in the baseline worktree (`LIMITS.md §3c` cold-start
analog). The style gates were separately confirmed green in the working tree at Step 2b of the build.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

Computed by `pharn/floor/check-regress.mjs verdict` (exit **0**), from exit codes alone. The verdict is
floor-grade; everything around it — choosing the base, partitioning, running the suite, isolating the
worktree — is advisory orchestration.

**The honest residual:** this catches **exactly what its deterministic suite catches, nothing more.** A
regression no test, rule, or eval covers is invisible here. "No regressions" is **not** "nothing broke" —
and for a prose-only increment it is a weak signal by construction: no test in this repo reads README
sentences, which is the very gap the increment's own F5 finding is about.
