# GRILL — loop-closeout-script

- **Plan:** `.dev/features/loop-closeout-script/PLAN.md`, approved at GATE 1 by the batch orchestrator under the
  user's delegation (Q1: proceed, and record that C2's bar was met in 1 of 3 runs; Q2: keep each re-point minimal;
  Q3: accepted, with the post-commit crash presentation made explicit; Q4, Q5: accepted as stated bounds).
- **Spec-hash check:** `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` recomputed, equal to the pin.
- **Step 1b, the lessons declaration (FLOOR):** `check-plan-lessons.mjs` exit 0, GREEN.
  `applied_lessons: L19, L22, L29, L35, L41, L44, L45, L54, L60, L62`; every cited id resolves and is referenced in the
  body. This is the declaration only, never the application (P0).
- **Grillers:** 13 registered (`count-grillers.mjs`), each one's procedure applied inline. The plan scanners printed:
  secrets `found:false`; PII `found:false`; i18n `found:false`; observability `mentions:false`; migrations
  `mentions:true` — its three hits are the word "revert" (the SPEC's Draft revert), not a data migration.

## Findings

Numbered G1–G7; the PLAN cites them by these numbers. Line numbers refer to the plan as grilled (commit `cc371e8`). **Disposition:** G1, G3, G4, G5, G6, G7 taken (the PLAN was
amended after this grill); G2 declined, reason below.

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/loop-closeout-script/PLAN.md:86"
  problem: "Exit 3 is terminal, so a record whose decision is non-green while the SPEC is still Approved (the model read the stop as green, skipped 6a, then wrote a non-green token) ends with the model's approval standing and no commit. Today that run reaches 6c, the decision check REDs and 6d reverts the SPEC. Make exit 3 conditional on the SPEC's state not being Approved; otherwise exit 4 with the same outcome, so 6d.2 runs."
  evidence: "not green → `not committed: <decision>` → releases → **exit 3**"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/loop-closeout-script/PLAN.md:116"
  problem: "A second run of the closeout after exit 0, 3 or 4 writes a second run-stop marker and, on a green record, tries a second branch. A guard (refuse when the current run already holds a run-stop) is possible."
  evidence: "Exit codes, one class each"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-closeout-script/PLAN.md:67"
  problem: "Children inherit stdin. A commit hook that reads stdin blocks until the Bash tool kills the whole closeout, which is the crash-with-unknown-state case. Spawn every child with stdin ignored, advise the Bash timeout, and name the residual (a hook that hangs anyway)."
  evidence: "each child spawned as an argv vector, node by `process.execPath`"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-closeout-script/PLAN.md:110"
  problem: "The echo rule names child output but not stderr; both streams are untrusted DATA and must be indented the same way, with only mark-phase's own stdout line at column 0."
  evidence: "Every child's output is echoed indented under a `── <step> (exit N)` header"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/loop-closeout-script/PLAN.md:226"
  problem: "The order test is described by child names only; a mutated argv (a dropped `--front`, a `--command /pharn-ship` in the loop's ledger call) would pass it. The stub runner must record and assert each child's full argv, with a mutation control per property (L60)."
  evidence: "the child ORDER recorded by a stub runner equals today's"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-closeout-script/PLAN.md:41"
  problem: "GATE 1's answers are not in the plan yet: the confirm-first correction and why C2 is adopted anyway (the user's request; the commit path as tested code), and the explicit presentation of a post-commit crash."
  evidence: "This plan proceeds because the user asked for all nine items"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-closeout-script/PLAN.md:68"
  problem: "Floor children resolve from the script's directory while the hooks and every path operand resolve from the invoking directory. State that the closeout runs from the project root like every pinned line, and that a wrong directory is exit 2 (no feature directory), never a partial run."
  evidence: "floor children resolved from the script's own directory, hooks from the invoking directory as the pinned lines did"
```

**G2 declined (P7).** Today's prose carries the same exposure: re-running Step 6c's branch block creates
`pharn-loop/<name>-2`, and re-running the run-stop line writes a second marker. No run has done either, so a guard
would be an addition with no recorded failure. The close part says to run the line once instead (advisory).

## Summary

The design keeps every ordering and outcome, but one terminal path (G1) lost today's backstop for a record that
disagrees with the model's own reading of the stop; the fix is a state read the 6a rule already keys on. The rest are
precision items: stdin, stderr, argv-level order tests, the GATE-1 record, and the working-directory rule.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 2 important, 5 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict above is separate and is not counted here.
