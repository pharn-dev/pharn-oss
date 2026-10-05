# GRILL — regress-pre-run-snapshot

Plan: `.dev/features/regress-pre-run-snapshot/PLAN.md` at `fdeb7e7`. Spec-hash check: `node .dev/floor/hash-doc.mjs
pharn/ARCHITECTURE.md` → `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's
`spec_content_hash` (no drift). **Step 1b (FLOOR):** `node pharn/floor/check-plan-lessons.mjs
.dev/features/regress-pre-run-snapshot/PLAN.md .dev/memory-bank/lessons-learned.md` → exit **0**, `GREEN —
applied_lessons: L17, L19, L35, L38, L43, L54, L58, L59, L65 … all 9 cited id(s) resolve … and are referenced in the
plan body`.

**How this grill was run (recorded, advisory).** The interrogation was done by an independent, read-only Opus agent
with a fresh context (it wrote nothing and ran no setter), briefed to test the plan against the live code rather than
the plan's own descriptions. The builder wrote this file from its report; the agent's free text below inherits the
plan's untrusted tag and is quoted as DATA (P2). The 13 registered grillers (`node pharn/floor/count-grillers.mjs .`)
were applied by axis; a11y and i18n do not apply (no UI, no locale text), migrations does not apply (no database; the
new JSON blocks are additive and the progress schema is unchanged).

## Findings

```yaml
- type: FINDING
  rule_id: "P7"
  severity: blocking
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:44"
  problem: "A later run's capture records an earlier attempt's scope escapes as pre-run state and subtracts them — a false pass on what the check exists to catch, named nowhere."
  evidence: "Every --open rewrites the marker (run-marker.mjs:98, require-loop-record.cjs:305); ship STOP on scope-escaped → re-run → capture records X → regress passes with X under unchanged."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-loop-close.md:198"
  problem: "A green loop can now commit a tree that differs from the one its gates verified: Step 6c stages plan scope ∪ artifacts ∪ pinned, so subtracted pre-run paths are left out of the commit."
  evidence: "Before, any undeclared dirty path stopped the run at S9; the residual at :409 names only the declared-file case."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-regress.md:59"
  problem: "A pre-run-dirty test or eval file stays in `inside`, so it drops out of outside_tests and is never compared — the 'Guaranteed: any regression OUTSIDE the feature …' bullet becomes false for it."
  evidence: "check-regress.mjs:318-320 derives outside_tests from inside; that state never reached the gates before (the run refused first)."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/stage-regress.test.mjs:472"
  problem: "The ✧ PARITY test pins scope.json byte-identical to `check-regress.mjs scope` stdout; always writing pre_run_snapshot into scope.json breaks it, and the plan names only the report test."
  evidence: "Also stale: stage-regress.mjs:526-528 ('its bytes are that CLI's'), :908-909 and regression-report.md:27,32-34 ('ONE additive block')."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-ship-quick.md:132"
  problem: "Claims made stale and missing from Files: ship-quick :132 and README :155 ('a changed file outside the plan's ## Files still stops the run'), ship-close :357-362's quick Bounded list, the check-regress.mjs and quick-scope-core.mjs bound blocks, the S9 row naming Step 1a's triggers."
  evidence: "LIMITS §6 says every bound is 'stated in that checker's own header'."
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:91"
  problem: "STOP on any capture failure turns an optimization into a new precondition for every run, clean trees included; the 6.33.0/6.34.0 precedents treat their write failures as non-fatal."
  evidence: "head-reuse-offer.mjs:30 'NEVER A NEW FAILURE MODE'; regress-base-reuse.mjs:239 write-failed is a stderr note."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:249"
  problem: "Ship captures after GATE 1, so anything written during the GATE-1 turn is recorded as pre-run; not named."
  evidence: "The marker opens only after check-spec-approved exits 0."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:167"
  problem: "'Reported → floor in code' is too strong for a resumed chain: the render re-reads scope.json, a write-tool-reachable .pharn/ file, while a chain is paused."
  evidence: "stage-regress.mjs:844-845, 868."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:64"
  problem: "'never node's exit 1' is false with static imports: a sibling that fails to load exits 1."
  evidence: "check-quick-scope.mjs:7-13 records exactly this failure class."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/quick-scope-core.mjs:1"
  problem: "The quick checker's load graph gains regress-base-reuse.mjs and run-gates.mjs, so a broken run-gates makes the quick check `crashed`."
  evidence: "The core/IO split is defensible (6.33.0 precedent); write-once closes a hole this design opens, so it is not speculative."
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:70"
  problem: "No status row for an unresolvable git dir or a record that is a link/FIFO/oversize; `unchanged` is ambiguous between the subtracted list and record ∩ inside ∩ equal."
  evidence: "stage-regress exit 1 = CRASHED, so each needs an explicit mapping."
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:110"
  problem: "Missing negative controls: a mixed case (one subtracted, one new escape, both in the detail); a record path not in inside never opened; a non-vacuous ★ HOOK control; the re-run bound pinned; a throwing reader → quick exit 2 crashed; base-changed end to end under BASE_RULE."
  evidence: "head-reuse-offer.test.mjs:201's .pharn/ control pattern."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:83"
  problem: "Privacy: the loop commits REGRESSION.md, so a green run now publishes the names of the user's unrelated uncommitted paths on the branch."
  evidence: "Before, only a blocked (uncommitted) run showed them."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/reconcile-baseline.mjs:182"
  problem: "hashFile buffers each whole file; capture hashes every changed path, so a huge untracked file is fully read into memory — state a size cap mapping to unhashable."
  evidence: "readFileSync(fd)."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/regress-pre-run-snapshot/PLAN.md:23"
  problem: "The porcelain file is also read by pharn-loop-close.md:308 (the summary line), not only by render-run-report."
  evidence: "git grep pre-run-status."
```

## Disposition (builder, under the orchestrator's GATE-1 delegation — a model decision, not a human approval)

- **#1 taken, as a stated and tested bound — no mitigation added.** A re-run's snapshot does record an earlier
  attempt's escape, and that cannot be separated from the case this increment exists to pass: `billing-plan-catalog`'s
  leftovers WERE an earlier run's (`pharn/features/billing-plans-entitlements/`). A feature-directory heuristic would
  cover only `/pharn-ship`'s same-name re-run and not the loop's `<slug>-2`. What bounds it: the path is reported
  (`pre_run_snapshot.unchanged`, REGRESSION.md), it is never committed by `/pharn-loop` (Step 6c stages plan scope ∪
  this feature's artifacts ∪ pinned tests, none of which a subtracted path can be), and the remedy text says a re-run
  does not clear an escape. Named in both module headers, the contract, `pharn-regress.md` and PROTECTED-FOLLOWUPS;
  pinned by a test.
- **#2 taken:** the loop's summary gains a line naming the subtracted paths (present when the gates ran, not in the
  commit), and the claims residual says the branch alone is not the verified tree.
- **#3 taken:** `pharn-regress.md`'s guaranteed bullet is qualified; `outside_tests` is unchanged (the approved
  escape-set-only scope; `/pharn-verify` still runs the whole suite at HEAD).
- **#4 taken:** the PARITY test compares scope.json minus the block; the stale comments and contract sentences are
  corrected.
- **#5 taken:** ship-quick, README, ship-close, both checker headers corrected; the S9 row is not re-padded — the new
  line is named "Step 1a's second snapshot line", which the row's "Step 1a's snapshot" covers.
- **#6 declined:** the orchestrator decided STOP at GATE 1 (answer 2). Stated cost: an unwritable git dir also breaks
  the loop's own Step 6c commit (git writes objects there), and every other refusal is a misuse (two markers, a
  re-capture), so the stop is cheap and sits before any model work.
- **#7 taken:** named as a bound (ship's snapshot is the tree at GATE-1 approval, whoever changed it before).
- **#8 taken:** the audit splits it: the subtraction is decided in one invocation before any pause (floor); the
  block a resumed chain renders is re-read from scope.json (advisory).
- **#9 taken:** the claim is dropped; a load failure is node's exit 1, which both callers read as a stop.
- **#10 accepted as stated:** the load graph is named in the header; the quick entry already maps a load failure to
  `crashed`.
- **#11 taken:** an unresolvable git dir reads `no-snapshot`; a link, FIFO, directory or oversize record reads
  `snapshot-malformed`; `unchanged` is the subtracted list only.
- **#12 taken:** all six controls are in the test list.
- **#14 taken as a stated bound** (names only, never contents; `inside` already lists them).
- **#15 taken:** a file over 64 MiB digests as `unhashable` (never subtracted).
- **#16 taken:** corrected in the plan.

## Summary

The mechanism — a digest-equality subtraction applied after the closed exemptions, bound to the marker, base and
feature, failing closed on every miss — held under the agent's soundness probes (net-zero writes, recreated deletions,
link-domain separation, symlinked parents, nested repos, case and rename tricks). What the plan did not name is what
the design newly makes reachable: re-runs subtracting earlier escapes, a green loop commit omitting the pre-run edits
it was verified with, and pre-run-dirty tests left out of regress — plus one test it would break and stale claims
outside its Files.

ADVISORY VERDICT: 15 concerns raised (1 blocking-severity, 6 important, 8 minor) — for the orchestrator to weigh
before /pharn-dev-build. The Step 1b lessons verdict (GREEN) is a separate floor result and is not counted here.
