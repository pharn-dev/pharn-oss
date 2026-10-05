# GRILL — orchestrator-direct-stage-calls

- **Plan:** `.dev/features/orchestrator-direct-stage-calls/PLAN.md`, approved at GATE 1 by the batch orchestrator under
  the user's delegation (not a human approval), with both C3 and C1 kept.
- **Spec-hash check:** `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` recomputed, equal to the pin.
- **Step 1b, the lessons declaration (FLOOR):** `check-plan-lessons.mjs` exit 0, GREEN. `applied_lessons: L5, L19, L22,
L29, L31, L35, L36, L41, L44, L45, L60, L62, L63`; every cited id resolves and is referenced in the body. This is the
  declaration only, never the application (P0).
- **Grillers:** 13 registered (`count-grillers.mjs`). Each one's procedure was applied inline. The deterministic plan
  scanners printed: secrets `found:false`; PII `found:false`; i18n `found:false`; migrations `mentions:false`;
  observability `mentions:true`, one hit (line 181, "spans") in prose about the `executions` view, not a runtime
  surface.

## Findings

Numbered G1–G8 in the order listed; the PLAN cites them by these numbers.

**Disposition (2026-10-05).** All eight were taken; the PLAN was amended after this grill (its "Grill amendments"
section):

- G1: a question that ends a loop run gets its return marker from the inline return line, as in ship;
- G2: the direct call's failure modes are listed (a missing thin-caller command file, a failed clear);
- G3: the copy-pair obligation set is enumerated, member by member, with the rule that checks each;
- G4: the two halves of the direct call's tests are named so neither stands in for the other;
- G5: `latestMarker`'s trust bound is stated and tested with a hostile last line;
- G6: the call's own work is added to the budget clock's "not counted" list;
- G7: both orchestrators' `reads:` name `stage-direct.mjs`;
- G8: `--no-agent-tool` and the open-stage rule are named as preserving today's behaviour, not additions.

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:111"
  problem: "finish defers the return marker on a question, and the plan names only ship's STOP path as running the inline return line. In /pharn-loop a question is S10 (a stop), so the stage's execution row would end at run-stop, unmeasured, and the requests between the read and the stop would bill to the stage. The loop's mapping must say the same: run the inline return line, then stop."
  evidence: "a run that STOPs on the question runs the inline return line first"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:136"
  problem: "The direct call's failure modes are not all named. The scope is set from the thin caller's own command file, so an install missing .claude/commands/pharn-regress.md (or pharn-verify.md) refuses the stage (exit 2, S9/STOP); and a --clear that fails leaves a .pharn/**-only scope that the next scoped step overwrites. Both should be stated in the header and the plan."
  evidence: "a setter that fails → exit 2, nothing else run or written"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:199"
  problem: "The L31 obligation set is named only as a parenthetical. A copy-pair's obligations need to be a closed list with the rule that checks each, or 'materialized' cannot be verified: the setter argv, the --timeout-ms/--budget-ms numbers, the 600000 Bash-tool timeout sentence, the resume line, and each stage-exit code (0, 2, 3, 4, 5, a crash, a Bash-tool timeout) named in each orchestrator's mapping."
  evidence: "its obligation set (scope target, `--timeout-ms`/`--budget-ms`, the 600000 Bash timeout, the resume line, each exit's handling) is materialized in the hygiene test"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:210"
  problem: "Executing a committed stage-direct line in a scratch tree runs the REAL stage script, which refuses there (no feature) — so that test proves one code's pass-through, the markers and the release, and nothing about codes 0/3/4/5 or a crash. The per-code pass-through and the scope-during-the-run property come from the module test with an injected script. The plan should name the two halves so neither is mistaken for the other."
  evidence: "the committed `start`, `finish` and `stage-direct.mjs` lines are EXECUTED from the command text in the suite"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:297"
  problem: "latestMarker reads .pharn/cost/<name>/markers.jsonl, unauthenticated state a Bash write reaches. The bound (a forged last line can only make start keep instead of write a marker; it never changes the route, the exit or the token printed) should be in the module header and pinned by a test with a hostile last line (a torn line, a non-object, a matching forged stage-start)."
  evidence: "a hostile markers file can at most make `start` skip a marker"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:140"
  problem: "The call adds work outside the stage script's budget clock: node's start-up, two setter spawns and two marker writes. The thin callers state that the pinned numbers hold the 600 s Bash cap only while uncounted work fits in the remaining 30 s; the direct call's own work joins that list and should be stated there."
  evidence: "no timeout of its own (the script budgets itself)"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:152"
  problem: "D3 does not say the two orchestrators' frontmatter reads: lists gain pharn/floor/stage-direct.mjs, as they list stage-agent.mjs and mark-phase.mjs."
  evidence: "`pharn-loop.md`: `## Running a stage` rewritten around `start` / `finish` and the inline return line"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/orchestrator-direct-stage-calls/PLAN.md:96"
  problem: "--no-agent-tool and the open-stage rule could read as new capabilities. Both preserve existing behaviour that the fold would otherwise break: today's inline:no-agent-tool route, and ship's question relay re-routing without a second stage-start. The plan should say so, so a reviewer does not weigh them as speculative additions."
  evidence: "`--no-agent-tool` on an `agent` cell → `inline:no-agent-tool` (exit 3) without consulting the config"
```

## Summary

- **The two important concerns** are a gap in the loop's question path (G1: no return marker, an unmeasured row) and
  an obligation set named but not enumerated (G3: L31's own remedy is the enumeration).
- **The six minor concerns:** name the direct call's failure modes (G2) and its uncounted budget work (G6); name the
  two halves of its tests (G4); state and test `latestMarker`'s trust bound (G5); list the new module in `reads:`
  (G7); say that two details preserve existing behaviour (G8).
- **Notes from the grillers:**
  - architecture and coupling: the new core imports the two stage cores' path tables and `stage-exit-core`, all in
    `pharn/floor/`, the same layer; no module edge crosses a capability root;
  - error-handling: covered by G2 and the plan's per-code tests;
  - observability: the call prints both marker lines into the orchestrator's tool result, which is what binds the
    run (`run-window-core.mjs` rule 6) — the plan's D5 says so;
  - performance: the call adds about two node spawns (~0.1–0.2 s) per stage against the ≈ 4.4 s orchestrator
    requests it removes — no finding;
  - security: the call executes the project's own `.claude/hooks/set-writes-scope.cjs` by a cwd-relative path, the
    same path the thin callers' pinned lines run, and passes a ship human's answer as argv, never through a shell;
  - testability: G4;
  - documentation and comprehension: the module headers carry the why; G3 and G8 tighten the plan's own text;
  - privacy, i18n, migrations and a11y: nothing applies.

ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 2 important, 6 minor), for the human to weigh before
/pharn-dev-build. This interrogation gates nothing. The Step 1b lessons verdict above is a separate floor result.
