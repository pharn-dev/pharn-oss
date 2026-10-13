# GRILL — unmeasured-gates-inconclusive

Plan: `.dev/features/unmeasured-gates-inconclusive/PLAN.md` · spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`
→ `75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`, equal to the plan's pin (no drift) · **Step 1b
lessons declaration: GREEN** (exit 0) — `check-plan-lessons.mjs`: all 10 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body (the declaration, never the application —
P0). The Step 1b verdict is a floor exit code and is not counted in the concern tally below.

Contracts read for grounding: `pharn/pharn-contracts/finding-shape.md`, `pharn/pharn-contracts/eval-format.md`,
`verify-report.md` (field table, `gate_run` block, `ac_gate` precedence), `regression-report.md` (base-evidence
integrity), `gate-run-record.md` (the reason-code section), `loop-record.md` (`STOP_TERMINAL` meaning), plus the code the
plan's claims rest on: `run-gates.mjs` `spawnGate` / `runNext`, `check-verify.mjs` `main`, `check-regress.mjs`
`runVerdict`, `check-loop.mjs` `main`, `loop-fresh-core.mjs` checks B and E and `stampDerivedMismatch`,
`stage-verify.mjs` verdict phase and `stage-verify-core.mjs` `classifyVerdict` / `composeReport`.

## Findings (ADVISORY — every one is model judgment; none gates `/pharn-dev-build`)

### Inline axes

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/unmeasured-gates-inconclusive/PLAN.md:151"
  problem: "The GATE-1 requirement (pin that a SIGTERM-trapping gate recorded exit 0 / timed_out true is now INCONCLUSIVE, not PASS) cannot be met by the real-runner test alone: in a scratch repo the runner's injected `instruction-growth` and `reconcile` gates exit 1 (the plan's own probe shows both red), so a real-runner stamp is never PASS even today and the 'was PASS' half is unobservable there. The pin needs two halves: the real runner records exit 0 + timed_out true for that gate (the premise), and a stamp carrying that run with every other run 0 reads INCONCLUSIVE, with its control (timed_out false) reading PASS."
  evidence: "one test that drives the REAL runner (the probe above) into `check-verify` and `check-loop` → `STOP_TERMINAL` `unmeasured`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/unmeasured-gates-inconclusive/PLAN.md:80"
  problem: "D2 puts the unmeasured branch first but never states its interaction with INCOMPLETE: over an incomplete build a hung or unstartable gate now reads INCONCLUSIVE (terminal in the loop) where today it reads FAIL (a loop CONTINUE); /pharn-ship's Step 2b retry stays unreachable either way. The contract should say so, since 6.20.4 deliberately let INCOMPLETE beat an unmeasurable AC gate for the opposite reason."
  evidence: "It is the FIRST branch of the precedence, before a real red gate"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/unmeasured-gates-inconclusive/PLAN.md:155"
  problem: "The check-B pass-through test must reach FRESH over a fixture whose stamps genuinely produce the coded verdict; a fixture that sets reason_code on a report whose stamp re-derives something else would stop at check E (report-verdict-mismatch) and a test asserting only 'B did not fire' would pass on the wrong branch."
  evidence: "B pass-through for each member of `UNMEASURED_CODES` (reaching FRESH over an otherwise honest fixture)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/unmeasured-gates-inconclusive/PLAN.md:102"
  problem: "D4 does not state the cost it introduces: with the codes passed through, a STALE coded report now meets checks F/G and is re-run inside the iteration (the existing one-re-run budget), so a hang can cost one more stage timeout before the terminal stop, where today's S11 stopped at once. Bounded, but it should be said where D4 says 'the remaining checks run as for any report'."
  evidence: "the remaining checks (C, D, J, E, H, F, G, I) run as for any report"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/unmeasured-gates-inconclusive/PLAN.md:8"
  problem: "The plan's base line names fa983a8 with main RED; the branch has since fast-forwarded to origin/main 8fe73d1 (#343, main green, still 6.58.0), so the stated base and the RED-main caveat are stale."
  evidence: "cut from `origin/main` at `fa983a8` (6.58.0)"
```

Checked and **confirmed** rather than raised (live this run):

- `stage-verify.mjs` writes any classified verdict with its report (`classifyVerdict` admits `INCONCLUSIVE` ↔ exit 2),
  and `composeReport` keeps every checker key in order, refusing only its own merged keys — so `unmeasured_gates` and
  `reason_code` reach `verify-report.json` with no stage-script change, as D7 claims.
- `check-loop.mjs`'s `unmeasured` predicate is evaluated before `ac-evidence` and `reconcile` and reads only the two
  `.verdict` enums, so a verify `INCONCLUSIVE` reaches `STOP_TERMINAL` / `unmeasured` with no change there (D4).
- `stampDerivedMismatch` accepts a non-FAIL report only with an empty `failing_gates` (`allowed = [stampOnly.verdict,
"INCONCLUSIVE"]`); D2's `failing_gates: []` keeps an honest report agreeing over a moved tree.
- Freshness `REPORTS` reads verify, then regress, in check B — so without D4 a `head-timed-out` regress report would
  stop at B before `check-loop.mjs` is read, as Q5 says.
- The REASON_CODES two-way closure tests (`gate-run-core.test.mjs`) scan emitted literals, so each new member needs a
  literal emitter in `check-verify.mjs` / `check-regress.mjs`, which D2/D3 provide.

### Registered grillers (`node pharn/floor/count-grillers.mjs .` → `registered: 13`)

| griller        | Layer 1 (scanner, deterministic)       | Layer 2 (judgment)                                                                                          |
| -------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| testability    | —                                      | the property set is materialized (L29) with controls (L34); the two test-design concerns above              |
| architecture   | —                                      | fit recognized: the predicate joins `timedOutRunIds` in `gate-run-core.mjs`; no new module, no layer change |
| coupling       | —                                      | no new cross-module reference: both checkers already import `gate-run-core.mjs`                             |
| security       | —                                      | no new input channel; gate ids stay fenced; the change only moves verdicts toward "not green"               |
| error-handling | —                                      | present: a hung or unstartable gate now becomes a named inconclusive instead of a silent red or green       |
| performance    | —                                      | one pass over the stamp's runs; the freshness re-run cost is the D4 concern above                           |
| documentation  | —                                      | present: four contracts, four commands, two guides, CHANGELOG; the INCOMPLETE statement above               |
| comprehension  | —                                      | the WHY of D1–D7 and the probe table are captured                                                           |
| observability  | `scan-plan-observability`: no mentions | not operationally significant beyond the reports themselves                                                 |
| privacy        | `scan-plan-pii`: nothing found         | no personal data                                                                                            |
| i18n           | `scan-plan-i18n`: nothing found        | no user-facing locale strings                                                                               |
| migrations     | `scan-plan-migrations`: no mentions    | no stored-record shape change (additive report keys only)                                                   |
| a11y           | —                                      | no UI                                                                                                       |

The five Layer-1 scanners were run over `PLAN.md` this time (each exit 0, no hits). No griller produced a finding
beyond the five above. (`scan-plan-secrets`: nothing found.)

## Summary

The plan's central claims were re-derived from live code: the stamp already carries what the verdict needs, the stage
script passes the new key through, `check-loop.mjs` already stops an inconclusive verdict terminally, and freshness E
stays in agreement because the rule reads the stamp alone. The concerns are test design (the GATE-1 pin needs a
hand-built PASS control beside the real-runner premise; the check-B test must reach FRESH, not merely skip B) and three
statements the plan should make (the INCOMPLETE interaction, the freshness re-run cost, the moved base). All five are
inside the approved intent and are taken into `PLAN.md` before the build (`## Amended after grill`).

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: 1 important, 4 minor; all five taken into the
plan) — for the human to weigh before /pharn-dev-build.
