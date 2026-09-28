# REGRESSION — run-performance-breakdown

- base: `1f6e2d610b1141ca59b02b84b2a1c798946f1d29` (`HEAD`: the working tree carries the uncommitted build, so the
  base is HEAD, per Step 1's deterministic rule)
- inside: the 26 changed and untracked paths listed in `regression-report.json` (every one declared in `PLAN.md`
  `## Files` or exempt as this feature's own stage artifact; `check-regress.mjs scope` reported `escaped: []`)
- outside: 123 test files, `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before each side ran)
- style gates: skipped at both sides — `inside` touches no shared style config

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (123 outside files, `cat outside-tests.txt \| xargs node --test`)                  | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the base/head
comparison over the gates above, and nothing more (P0): it catches what the outside suite catches.

## A void first run, recorded rather than overwritten silently

The first regress of this increment is **void**. Its orchestration waited for `.pharn/pharn-dev-regress/base-results.json`
and `head-results.json` to EXIST — and both already existed, written by an EARLIER session's `/pharn-dev-regress` into
the same shared `.pharn/` scratch directory. The wait passed at once, the verdict was computed over those stale maps,
and the base worktree was then removed while this run's own base side was still executing (it later failed with
"eval-pair path unreadable"). That verdict read `no-regressions`, but it measured nothing of this build.

This report is the RERUN, after the GATE-2 review fixes: every file lives under a private
`.pharn/pharn-dev-regress/rpb/` directory created empty for this run, the base side ran to completion before the
head side started, and the verdict was computed only after the background process that wrote both maps exited.
The input-capture boundary this breaks is `.dev/memory-bank/lessons-learned.md` **L5**/**L21** (cited, not restated).
