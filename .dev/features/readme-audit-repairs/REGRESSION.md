# REGRESSION — readme-audit-repairs

**STAGE STOPPED BEFORE THE VERDICT.** `check-regress.mjs scope` exited **1** with a blocking fix #7
finding, and the stage spec is explicit that this is _"a scope breach, not a regression — surface it and
stop."_ No `verdict` was computed, so **`regression-report.json` is deliberately NOT written**: that file
is contractually the helper's `verdict` JSON verbatim, and fabricating one for a run that never reached
Step 3 would be the exact P0 disease this repo exists to prevent.

- **Base:** `4bd1b0c3269504ee55060b2a74ca8f1eca68de23` (working-tree dogfood — `git status --porcelain`
  non-empty → `base = HEAD`, per the Step-1 deterministic state test).
- **Declared writes (`PLAN.md` `## Files`):** `README.md` — one path.

## The partition

| classification   | path                                              |
| ---------------- | ------------------------------------------------- |
| inside, declared | `README.md`                                       |
| `escape_exempt`  | `.dev/features/readme-audit-repairs/PLAN.md`      |
| `escape_exempt`  | `.dev/features/readme-audit-repairs/GRILL.md`     |
| **`escaped`**    | `.dev/features/claude-dir-scan-exclusion/PLAN.md` |

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/claude-dir-scan-exclusion/PLAN.md"
  problem: "changed file '.dev/features/claude-dir-scan-exclusion/PLAN.md' is outside the declared writes-scope (fix #7) — the build escaped its plan's `## Files`"
```

## Why the finding's stated cause is wrong here — and why that is a limitation, not a dismissal

The finding is **correctly emitted** and its wording (_"the build escaped its plan's `## Files`"_) is
**false for this run**. The evidence, gathered live:

1. **It is a different increment's plan.** Its title is "close the `.claude/` scan exclusion, and repair
   the three expired/ambiguous doc claims beside it"; its `applied_lessons` are
   `[L1, L11, L19, L26, L29, L31, L33, L34, L36]` — a different set from this plan's.
2. **The timestamps order it outside this build.** The file was written at **10:38:21**; this build wrote
   `README.md` at **10:43:54**.
3. **This build could not have written it.** Its writes-scope was `['README.md']` for every write, and
   fix #7 demonstrably denies out-of-scope writes — it denied _this session's own_ `GRILL.md` write at
   ~10:37 when the scope had been clobbered. The guard is not a claim here; it fired on this session.
4. **A concurrent writer was observed directly.** Mid-grill, `.pharn/writes-scope.json` was overwritten
   with `{"scope":[".dev/features/claude-dir-scan-exclusion/PLAN.md"],"set_by":".claude/commands/pharn-dev-plan.md","set_at":"2026-09-10T08:36:36.747Z"}`.

**The real cause is concurrency, and it is a genuine limitation of this stage's method.** `scope` derives
`escaped` from `git diff <base>`, which answers _"what changed since base"_ — not _"what did this build
write."_ The command already documents that gap for the feature's own artifacts and closes it with
`--feature`. **A second agent session writing into the same working tree is the same gap in a case
`--feature` does not cover**, and it is not hand-filterable: `.dev/memory-bank/lessons-learned.md` **L17**
and **L20** are precisely about not hand-excluding paths to make this check pass.

## Verdict

**INCONCLUSIVE — stage stopped at the scope check; no regression verdict was computed.**

This is **not** "no regressions" and **not** "regressions". The honest statement is that the comparison
**never ran**, because its input partition is untrustworthy while a second session mutates the same tree.
Recording it as clean would certify a comparison that did not happen.

The stage's standing residual applies unchanged and is worth restating for whoever resumes: even a
completed run catches **exactly what its deterministic suite catches, nothing more** — never "nothing
broke."

## What unblocks it

Any one of these makes the partition trustworthy again; none should be done by an agent that does not own
the other session's work:

- let the concurrent `claude-dir-scan-exclusion` session finish and commit, then re-run `/pharn-dev-regress`;
- or commit this increment's `README.md` change and re-run with `--base <that commit>`, so the other
  session's untracked file is no longer in `git diff <base>`;
- or run this increment in an isolated worktree, which is the structural fix for two sessions sharing one
  tree and one mutable `.pharn/writes-scope.json`.
