# GRILL — build-gate-bounded

- **Plan:** `.dev/features/build-gate-bounded/PLAN.md`, approved at GATE 1 by the batch orchestrator under the user's
  delegation (Q1 yes — merge `gate-exclusion-config` once its stacking push lands; Q2 keep `build`; Q3 accepted).
- **Spec-hash check:** `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` recomputed, equal to the pin.
- **Step 1b, the lessons declaration (FLOOR):** `check-plan-lessons.mjs` exit 0, GREEN.
  `applied_lessons: L22, L30, L34, L35, L41, L44, L45, L54, L62, L66`; every cited id resolves and is referenced in the
  body. This is the declaration only, never the application (P0).
- **Grillers:** 13 registered (`count-grillers.mjs`). Each one's procedure was applied inline. The deterministic plan
  scanners printed: secrets `found:false`; PII `found:false`; i18n `found:false`; migrations `mentions:false`;
  observability `mentions:true` — its hits are the word "log" (gate logs on disk), which the plan already says where
  they live and who reads them.

## Findings

Numbered G1–G10 in the order listed; the PLAN cites them by these numbers.

**Disposition (2026-10-05).** G1–G8 and G10 taken (the PLAN was amended after this grill); G9 declined, reason below.

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/build-gate-bounded/PLAN.md:87"
  problem: "The plan adds an `onStep` callback to stage-runtime.mjs drainGates, the drain both stage scripts share and the one `gates-parallel-drain` (batch item 5) is rewriting. The per-gate time can be taken without touching it: drainGates calls budget.may() before each `run --next` and budget.spent() after each successful one, so a wrapped budget object observes both edges."
  evidence: "One additive change: an optional `onStep` callback receives each `run --next` result with its wall-clock ms"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/build-gate-bounded/PLAN.md:113"
  problem: "The second target source (files that failed in the last full run) has no recorded trigger: the plan's own evidence says all 14 failing files of the agent's first full run were declared writes. It also lets a pre-existing red outside the plan into every targeted run, which then can never go green."
  evidence: "the files of the tests that FAILED in this feature's last `full` run, when its stamp validates"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/build-gate-bounded/PLAN.md:116"
  problem: "The badPath filter is stated for the declared source only; the rule should apply badPath, isTestFile and the regular-file lstat to the whole final set, so any later source inherits them."
  evidence: "kept when `ac-tests-core.mjs` `badPath` accepts it"
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/build-gate-bounded/PLAN.md:146"
  problem: "Step 4's mapping says HALT for full-mode exit 2 or a crash but not what a routed build agent reports then, nor what exit 4 becomes under a routed agent. Rule 6 of the brief reads any non-zero gate as `--gate fail`; exit 4 must become the existing `refused S4` (loop) or a question (ship), never `--gate pass`."
  evidence: "`4` → ask the human (S4 under `/pharn-loop`), `2`/crash → HALT"
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/features/build-gate-bounded/PLAN.md:150"
  problem: "The pharn-ship.md bullet edit touches a file `orchestrator-direct-stage-calls` edits in the same batch, and the sentence it fixes is not made less true by this increment (the e2e sentence beside it becomes true by tested code). Drop the edit and name the stale `--gates` clause as a residual."
  evidence: "It now cites `pharn/floor/build-gate.mjs --mode full` instead of the `--gates` clause"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/build-gate-bounded/PLAN.md:86"
  problem: "GATE 1 answered Q1: the exclusion is merged before the build and a test must prove it reaches both modes now, not at stacking."
  evidence: "(a stacking-time test asserts it)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/build-gate-bounded/PLAN.md:91"
  problem: "Durations measured around a `run --next` spawn include node's startup and two tree fingerprints; the printed label must say 'runner call', never 'gate time'."
  evidence: "wall time of its runner call (observed; it includes the runner's two tree fingerprints)"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/build-gate-bounded/PLAN.md:254"
  problem: "The WIRING test should run each pinned line as its own shell (L44) and assert the runner's out dir lands under `.pharn/pharn-build/<name>/`, so a pinned line that drifted to another out root is caught."
  evidence: "★ WIRING: the committed `pharn-build.md` lines run verbatim (with `<name>` substituted)"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/build-gate-bounded/PLAN.md:202"
  problem: "build-gate-core.mjs holds selection rules and summary rendering, two reasons to change."
  evidence: "pure rules: paths, the TARGET rule, excerpt and tail bounding, the summary renderer, the exit-code table"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/build-gate-bounded/PLAN.md:79"
  problem: "'Targeted' is the runner's reading of the file arguments: vitest treats them as substring filters and Jest as patterns, so more files may run (`a.test.ts` matches `a.test.tsx`), and a `test` script with its own glob runs that glob plus the files. State the bound; it is the red run's and regress head's bound too."
  evidence: "hands it those files after `--`"
```

## Summary

- **Four important concerns.** G1: keep the shared drain untouched (time through the budget's two calls). G2: drop the
  last-full-failure source (no trigger; an unfixable red would trap the fix loop). G4: say what a routed agent reports
  for every helper exit. G6: the exclusion is merged and tested now.
- **Minor concerns.** G3 filters the whole target set; G5 drops the shared `pharn-ship.md` edit; G7 labels durations
  honestly; G8 tightens the wiring test; G10 states the runner's pattern semantics.
- **G9 declined.** The core is small and has one caller; the summary renderer is a set of bounding functions over the
  same stamp the selection rules feed. Splitting would add a module edge for no second consumer (P7). Revisit when a
  second renderer appears.
- **Grillers.** architecture/coupling: the `build` stage reuses the runner; the shared-file diff is local (STAGES, one
  resolveSet branch, one init block). testability: every rule is pure and has a fixture path; the CLI is exercised in
  fixture repos. error-handling: exits are closed and `1` is never a verdict. performance: two fingerprints per gate
  (~75–460 ms measured) against gates of seconds to minutes. security/privacy: reporter text is fenced DATA and never
  reaches argv; target paths pass `badPath`. documentation: the helper's header is its spec (D4). i18n, migrations and
  a11y: nothing applies.

ADVISORY VERDICT: 10 concerns raised (0 blocking-severity, 4 important, 6 minor), for the human to weigh before
/pharn-dev-build. This interrogation gates nothing. The Step 1b lessons verdict above is a separate floor result.
