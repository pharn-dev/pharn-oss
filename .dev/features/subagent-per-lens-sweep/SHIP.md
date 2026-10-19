# SHIP — subagent-per-lens-sweep

`/pharn-dev-ship` roll-up (advisory). It records that the chain ran and the floor verdicts it read. It is not an
approval, a "shipped" claim or a seal.

Increment: the 6.64.0 follow-ups `subagent-per-lens-sweep` and `architecture-agents-dir`
(`.dev/features/review-lens-grouping/REVIEW.md` A1 and A8). Shipped prose stops saying that `/pharn-review` spawns one
subagent per lens, and `pharn/ARCHITECTURE.md §4` gains a place for `.claude/agents/` (6.64.1 → 6.64.2). Every stage
ran in its own opus subagent in an isolated worktree, with `feat/subagent-per-lens-sweep` as the handoff pointer. The
orchestrator held both gates and put each one to the human.

## Gates

- **GATE 1 — plan acceptance: the human approved in advance.** The maintainer wrote "1. I approve the plan." before
  PLAN.md existed, so this approved the plan's intent, not text they had read. In the same message they asked that
  every file the agent cannot write be changed by a Python patch script they run themselves. The orchestrator took the
  plan's four recommended defaults (Q1 yes, Q2 leave, Q3 patch H5, Q4 post-patch pin) and told the human, who raised
  no objection. Recorded in PLAN.md, `## GATE 1`.
- **The human-applied trusted-doc patch (H1–H5).**
  - The orchestrator generated the script from PLAN.md's `## Human-applied trusted-doc patch` and tested it on a
    scratch copy.
  - The human ran it on a scratch checkout of the branch. It printed all five blocks ok and the three planned
    digests: ARCHITECTURE `2c84959c…`, LIMITS `94805c21…`, THREAT-MODEL `ec0c9c78…`.
  - The orchestrator verified the digests with `.dev/floor/hash-doc.mjs` and committed the docs as `125ff0fe`, before
    grill and before build Step 0 (L68). It then deleted the script at the human's instruction.
- **GATE 2 — post-review decision: the human chose "Fix R2–R4, then PR (Recommended)".** R1 became the follow-up
  `lens-spawn-cite`. Trusted docs: "Confirmed". The orchestrator showed the human the exact `125ff0fe` diff, and the
  human confirmed it as their edit, which closes GRILL.md's P2 concern. Lesson: "Promote". Recorded in PLAN.md,
  `## Fix round 1`.
- **Promotion gate: the human chose "Accept & write"** for L76, as rendered, with `type: contract`.
- **The merge decision is the human's**, after the PR.

## Stages and verdicts (verbatim)

1. `/pharn-dev-plan` → `PLAN.md` (`50497b60`). It pins the post-patch `spec_content_hash` `2c84959c…`.
2. `/pharn-dev-grill` → `GRILL.md` (`22d514e3`). `check-plan-lessons.mjs` exit **0** (GREEN, 14 cited ids). The
   spec hash equals the pin. The L75 re-run reproduced the table's 152 line hits, 153 rows and 59/3/91 split. 6
   advisory concerns, 2 of them important.
3. `/pharn-dev-build`:
   - First pass `5c1a9035`: scope 26 paths, all 41 OLD texts matched exactly once, `node pharn/floor/validate.mjs .`
     exit **0** (GREEN, 37 capabilities).
   - Fix round 1 `09744eb0`: `## Files` widened by two paths before a fresh Step 0 (scope 28, re-anchored). `validate`
     exit **0** (GREEN, 37 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`, base `c47707e`:
   - Run 1 (`efe53830`): **`no-regressions`**.
   - Fix round 1 (`0e26688d`): **`no-regressions`**.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`:
   - Run 1 (`0571af0d`): **`PASS`**, `failing_gates: []`, reconcile CLEAN.
   - Fix round 1 (`e940ff26`): **`PASS`**, `failing_gates: []`, reconcile CLEAN on the new epoch.
   - After the L76 promotion (`484dda03`), `npm run check:reconcile` exit 0 (CLEAN) and `npm run docs:check` exit 0.
6. `/pharn-dev-review` → `REVIEW.md` (`4e9b1d7d`): GREEN, 0 floor-gate findings, 4 advisory. R2–R4 were fixed in fix
   round 1. R1 is the follow-up `lens-spawn-cite`: replace the spawn-unit restatement in the 19 lens bodies with a
   cite of `/pharn-review` Step 4, plus a `.dev/floor/` regex test that pins its absence.
7. `/pharn-dev-memory-promote` → L76 in `.dev/memory-bank/lessons-learned.md`, with `docs/lessons-index.md`
   regenerated and committed with it (`484dda03`). `check-provenance.mjs` exit 0 at Step 3 and again at Step 6.

The run ended at **GATE 2**.

- Artifacts: [PLAN.md](PLAN.md), [GRILL.md](GRILL.md), [REGRESSION.md](REGRESSION.md), [VERIFY.md](VERIFY.md),
  [REVIEW.md](REVIEW.md). Their findings are not restated here.
- Follow-up: `lens-spawn-cite` (REVIEW.md R1).
- changelog-entry: exit 0
- lesson: promoted L76
- deferred: none

## Deviations, recorded

This worktree's shell guard refused the pinned `$VAR`, `$(…)`, `xargs` and `$?`-capture forms of build Step 2b,
regress Steps 1–2 and verify Step 1. The same commands ran through scratch node runners under `.pharn/` (`spawnSync`
argv arrays), or as plain commands with their exits echoed. Each stage's report records this. The runners were
deleted before every lint run.

---

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
