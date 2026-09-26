# SHIP — stage-regress-script

- **What this is.** `/pharn-dev-ship`'s advisory roll-up of the increment that makes `/pharn-regress` a
  thin caller of `pharn/floor/stage-regress.mjs`, with the shared stage-exit contract.
- **Where the run ended.** At **GATE 2**, after `/pharn-dev-review`, its re-review and two GATE-2 fix
  rounds.
- **Who wrote it and how.** The review agent wrote Steps 2b, 2c, 3 and the Final step, on opus, at the
  orchestrator's direction.
- **Step 3's two commands.** The permission system first denied them. The maintainer then approved
  them in chat, as relayed by the orchestrator, and the single retry of exactly the two pinned lines ran.

## Stages, in order, and on which model

Every stage ran as an Agent subagent; effort was not routed.

1. **`/pharn-dev-plan`** — opus (`pharn.config.json` routing). Wrote PLAN.md.
2. **GATE 1** — APPROVED WITH AMENDMENTS (A1, A2). This was a MODEL decision by the orchestrator under the
   maintainer's delegation, not a human approval.
3. **`/pharn-dev-grill`** — opus. It ran in the same agent as the plan, which weakens it as a second look,
   as GRILL.md itself states.
4. **`/pharn-dev-build`, `/pharn-dev-regress`, `/pharn-dev-verify`** — sonnet (`pharn.config.json`
   routing).
5. **`/pharn-dev-review`** — opus. Verdict: blocked, with 2 floor findings.
6. **GATE 2 → FIX**, round 1 — a model decision by the orchestrator under the maintainer's delegation.
   Sonnet started the fixes. On the maintainer's instruction "use opus not sonnet" (2026-09-26) the round
   was handed to opus, which re-reviewed it and re-ran verify.
7. **GATE 2 → FIX-then-SHIP**, round 2 — again the orchestrator's model decision under that delegation.
   The reviewer made the last fixes itself, on opus, then re-ran regress and verify.
8. **This roll-up.** From item 6 onward every stage ran on opus. That was set by the maintainer's
   instruction, overriding `pharn.config.json`, which names sonnet for build, regress and verify.

## Structural verdicts (read live when this file was written, verbatim)

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (`GREEN — … all 21 cited id(s) resolve …`).
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 36 capabilities
checked in "."`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**. The standing run
  covers the WHOLE increment from its merge-base `767bf61f493f73c859a9820a01bddcb8f4f40a8d`, with all
  6 gates, style included.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`**, `failing_gates` `[]`. The standing
  run is the third round-2 attempt, on the final tree: 7 gates, `npm test` 3453/3453, and `reconcile`
  CLEAN over the round-2 epoch.

REGRESSION.md and VERIFY.md record every earlier attempt, the failing one included.

## Review and grill

- **Review:** `.dev/features/stage-regress-script/REVIEW.md`. Findings and dispositions are there, cited
  and not restated here (P4). After round 2 it records **0 open floor-gate findings**.
- **Grill:** `.dev/features/stage-regress-script/GRILL.md` (advisory).

## CHANGELOG entry check (Step 2c)

`changelog-entry: exit 0`

This ran after `git fetch --no-tags origin main`. It is presented here and is never a proceed/stop input.
"GREEN" never means that the entry describes the increment.

## Lesson (Step 2b)

`lesson: skipped` — the candidate proposed in REVIEW.md ("an unprobed quantified claim falls to one
probe") was declined at 2b.3.

- **Why.** The pattern is L37's, already canon. Its recurrence here is noted in this file, not promoted as
  a duplicate.
- **Who decided.** The orchestrator, under the maintainer's delegation. That is a model decision, not a
  human's answer to the 2b.3 form.
- **Why `skipped`.** The orchestrator's instruction said "declined". `skipped` is the member of the
  closed set whose meaning is "a candidate was proposed and declined at 2b.3". A `declined` token is not
  a member, and the closed set admits no variant spelling (L36).

**The recurrence, recorded.** Every one of these new, quantified claims fell to one probe:

- the round-1 build: F1, F2, A6, M1, M2 (REVIEW.md);
- the round-1 fixes: A3's comment, N1, N2 (REVIEW.md, re-review).

Round 2 probed its own new claims before writing them.

`deferred: none`

## Follow-ups (named, not built)

- `regress-failed-install-false-green` (amendment A2, carried forward unchanged).
- `architecture-contract-list-stage-exit` (GATE 1 Q1): `pharn/ARCHITECTURE.md` §4's contract list omits
  `stage-exit`. That file is human-only.
- Residuals named at review and still open, all minor (REVIEW.md, "Still open"):
  - N5: the round-trip tests' fidelity;
  - the containment TOCTOU within an invocation;
  - a kill landing inside "fresh" before its scratch clear.
- PLAN.md's other named deferrals, unchanged: `dev-regress-stage-script`, `stage-verify-script`,
  `stage-exit-model-stages`, `regress-answers-config`, and retiring the allowlist prose copy.
- **Outside this increment, found while measuring usage (below):** `pharn/floor/render-cost-record.mjs`
  keeps the FIRST transcript record per request. On current transcripts a request's lines can carry
  different `output_tokens` (measured: 8, 8, 163), so that rule undercounts output: 1,657 against 28,707
  on the review agent's transcript. It is offered as a separate task. It does not touch this increment's
  verdicts.

## Measured stage-agent usage

The rows are deduped requests from each agent's own transcript, counting the LAST record per request.
That reproduces the orchestrator's figures exactly (see the `render-cost-record.mjs` follow-up above).
**Minutes are the wall-clock span from an agent's first to its last transcript record, INCLUDING idle
gaps between resumes. They are not active compute time.**

- **plan + grill** (opus): 54 min.
  - requests 149 · input 300 · cache_write 1,155,299 · cache_read 72,200,730 · output 9,818.
- **build + regress + verify + GATE-2 fix round 1** (sonnet): 612 min.
  - requests 624 · input 1,248 · cache_write 2,881,054 · cache_read 376,402,233 · output 54,221.
- **review + re-review + verify re-run** (opus, before round 2): 508 min.
  - requests 135 · input 272 · cache_write 1,432,663 · cache_read 57,043,476 · output 28,707.
- **GATE-2 round 2** (opus), measured to 09:17Z: 39 min.
  - requests 101 · input 204 · cache_write 1,576,108 · cache_read 75,088,254 · output 5,318.
  - Requests after 09:17Z are **not included**: the permission-denied Step 3, its approved retry, and
    this file's write and commit.

One more transcript is not in these rows. It is described "Phase 1.1 plan (opus)", 10 requests over 1
minute. The orchestrator's measurement defines the rows above; it is mentioned so its absence reads as a
choice, not an oversight.

---

**chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.**
