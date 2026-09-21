# SHIP — loop-run-report

A thin, **advisory** roll-up of one `/pharn-dev-ship` run. Nothing reads this file.

## Stages that ran, in order

| stage                | structural verdict read                               | value                                                |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `/pharn-dev-plan`    | — (ends at **GATE 1**, its own approval halt)         | approved as written, after 4 open questions resolved |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit                         | **0** (GREEN)                                        |
| `/pharn-dev-build`   | `pharn/floor/validate.mjs` exit                       | **0** (GREEN — 36 capabilities)                      |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`                   | **`no-regressions`**                                 |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`                       | **`PASS`** (7/7 gates, `failing_gates: []`)          |
| `/pharn-dev-review`  | _no structural verdict exists_ — advisory lenses only | BLOCKED, 1 floor-gate finding (see below)            |

**Where the run ended: GATE 2**, then a human decision to fix, then `/pharn-dev-regress` and
`/pharn-dev-verify` were **re-run** and **recomputed** the two verdicts above over the corrected tree.
The values shown are the re-run values.

## Verdicts, verbatim

```text
check-plan-lessons.mjs : exit 0 — all 16 cited ids resolve in canon and are referenced in the plan body
validate.mjs           : exit 0 — GREEN, 36 capabilities checked in "."
regression-report.json : "verdict": "no-regressions"   (regressions[] empty, pre_existing[] empty)
verify-report.json     : "verdict": "PASS"             (failing_gates[] empty)
check-bash-reconcile   : CLEAN — 14 reconciled, 0 escapes, 5 exempted
npm test               : 2290 / 2290
```

### After the F3 fix (a later epoch — see REVIEW.md, "Follow-up: F3 fixed")

The F3 extraction landed after the run above, so these were re-measured over the corrected tree:

```text
npm run check          : exit 0  (all ten gates)
npm test               : 2291 / 2291   (+1 — the new cue-boundary parity case)
validate.mjs           : exit 0 — GREEN, 36 capabilities checked in "."
check-bash-reconcile   : CLEAN — 8 reconciled, 0 escapes, 2 exempted, over an epoch
                         re-anchored before the F3 work began
check-plan-lessons.mjs : exit 0 — all 16 cited ids still resolve and are referenced
check-build-complete   : "complete" — 18 declared paths, missing[] empty
```

**NOT re-run, and named rather than implied (P0):** `regression-report.json` and `verify-report.json`
still carry their GATE-2 values. `/pharn-dev-regress` and `/pharn-dev-verify` were **not** re-invoked
after the F3 fix, so those two lines above the fold are the earlier epoch's. What backs the F3 work is
the list directly above — the same deterministic gates those two stages read, run directly. Presenting
the stale `.verdict` values as though they had been recomputed would be the disease this file's closing
paragraph names.

## Pointers (cited, not restated — P4)

- [`REVIEW.md`](./REVIEW.md) — the four lenses, four findings, and the post-GATE-2 disposition table.
- [`GRILL.md`](./GRILL.md) — 8 advisory interrogation findings (3 blocking-severity). Its Step-1b
  lessons-declaration result is reported in its own header and is **not** folded into that count.
- [`PLAN.md`](./PLAN.md) · [`REGRESSION.md`](./REGRESSION.md) · [`VERIFY.md`](./VERIFY.md)

## What the human decided

- **GATE 1** — plan approved as written, after resolving four open questions (per-iteration verdicts;
  sharing the Handoff grammar; no contract/checker; the style-gate posture).
- **GATE 2** — `/pharn-dev-review` returned **BLOCKED** on one P0 finding. The human chose **fix F1 + F2,
  then re-verify**. Both were fixed inside the approved `## Files`; both stages re-ran green.

lesson: skipped

> A candidate was proposed at Step 2b — _"a probe that motivates a design rule licenses only the value it
> probed"_, drawn from F1 — and the human declined it at the 2b.3 gate on the ground that **L37** already
> prescribes "probe an excluded member" and **L40** already separates quantifier from attribution
> defects, so a new id would record a recurrence as though it were a new insight. Per **L46** that is the
> case where canon cannot distinguish an unapplied remedy from a missing one, and adding L53 would have
> obscured it.

fixed-after-gate-2: F3 — the `plan-files-core.mjs` extraction was DEFERRED at GATE 2 and then done
before the commit, at the maintainer's direction. `check-build-complete.mjs` exports nothing and both
consumers import the core; the extraction additionally surfaced that the Boundary-2 exclusion-cue break
had no product-floor test, now closed by a parity case with a mutation control. Superseding record:
REVIEW.md, "Follow-up: F3 fixed". The deferral line is replaced rather than deleted so the GATE-2
decision and its reversal both stay on the record.
deferred: F4 — `outcome: null` renders `decision unknown` rather than an `n/a` line; same class as F2,
one size smaller (REVIEW.md, advisory findings)

## Honest scope of this file (P0)

`/pharn-dev-ship` **adds no floor primitive.** Every verdict above belongs to a **sub-stage** —
`check-plan-lessons`, `validate`, `check-regress`, `check-verify`, the writes-scope hooks,
`check-bash-reconcile`. This command's contribution is running them in order and reading their exit
codes, which is **advisory orchestration**; the two human gates are preserved **by construction**, not by
any floor mechanism. Writing "`/pharn-dev-ship` ensured the chain ran" would be the disease.

The `lesson:` and `deferred:` lines above are **discipline over an unread file** — no checker parses
`SHIP.md`, and `validate.mjs` ignores `.dev/`. Their presence is not a guarantee that nothing was
dropped; the named residual `ship-lesson-line-check` stays deliberately unbuilt, because L20's bar is a
second occurrence and there has not been a first.

**Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good
or wise; that is the human's call at the post-review gate.**
