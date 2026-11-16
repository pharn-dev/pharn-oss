# REVIEW — gate-timeout-above-bash-cap

- Floor first (P0): `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, before and after the
  fix round.
- Reviewer: an independent read-only agent, given the code and the plan, not this orchestrator's conclusions; four lenses
  (L-floor P0, L-trust P2, L-axis P3, plus correctness). A second pass by the same agent re-checked the fix round. Its
  reports are model output and are summarised here as DATA.
- The increment was treated as `trust: untrusted`. No instruction-looking content was found in it.

**VERDICT: GREEN — 0 floor-gate findings.** First pass: 0 blocking, 2 important, 4 minor, all fixed. Re-review: 2
minor; 1 fixed, 1 declined with a stated reason. Advisory throughout: nothing below is read by a checker.

## Floor-gate findings

None. No guarantee was found without a floor reduction or an advisory label, no Capability was added (so no eval
binding is due), and no sibling reference was found.

## Advisory findings — first pass (all fixed)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/entry-gates.mjs:41"
  problem: "The header said the --wait takeover runs within its budget, which stops being true once a declared value exceeds --budget-ms: its first gate always starts and can run up to the declared value inside the 600 s Bash call."
  evidence: "within its budget (stage-exit-core.mjs mayStartSlowStep)"
- type: FINDING
  rule_id: P0
  severity: important
  file: "docs/pipeline.md (Lengthening the per-gate timeout)"
  problem: "The docs said a below-pinned value 'stops the run', but /pharn-loop reads the entry exit 2 as 'go on' and only stops at regress, after the build; the CHANGELOG was silent on when."
  evidence: "a smaller value stops the run with an error"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-direct.mjs:1012"
  problem: "The run pin also applies with no declaration, so the unqualified byte-identity claim needed the pinned-value condition, and the timeout-changed detail named gates.timeoutMs even when nothing was declared."
  evidence: "`pharn.config.json` `gates.timeoutMs` now gives 540000 ms"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/stage-direct.test.mjs"
  problem: "No test drove a declared value above --budget-ms, the realistic case, so the one-slow-step-per-invocation path with a declaration was unexercised."
  evidence: "AC2/AC4 declares 20000 against b=570000"
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/pharn-contracts/gate-run-record.md:268"
  problem: "The contract said 'cited, not restated' and then restated the value rule; and the refusing-block-falls-back rule existed twice, in entry-gates.mjs and stage-direct.mjs (L35)."
  evidence: "(cited, not restated — P4): an integer of milliseconds from 100 to 1800000"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/gate-run-record.md (What it proves)"
  problem: "It called 'a runner used the declared value' FLOOR, but only the range test reduces to a primitive; that both runners apply it is tested behaviour."
  evidence: "That a runner used the declared value is FLOOR"
```

What changed: the entry header states the takeover bound and the below-pinned stop (follow-up
`entry-timeout-refusal-stop`), and `gate-run-record.md` "What it costs" names both takeovers. `docs/pipeline.md` and the
CHANGELOG say when each orchestrator stops. The `timeout-changed` detail names where the value comes from, and the
byte-identity claim is qualified "given the same pinned value at entry and at the stage". A new test, "timeout (review
R4)", runs pinned 300 against declared 6000 with budget 4000: one invocation versus fresh, resume, resume. The rule now
lives once, in `gate-timeout-core.mjs` `resolveRunTimeout`, which both runners call, with its own test. The contract
cites the rule instead of restating it, and "What it proves" separates the floor range test from tested behaviour.

## Advisory findings — re-review

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-direct.mjs:1011"
  problem: "When the gates block itself refuses, the timeout-changed detail read 'nothing declared' although a malformed value was declared."
  evidence: "the pinned --timeout-ms, nothing declared"
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/gate-timeout-core.mjs (resolveRunTimeout)"
  problem: "With nothing declared, resolveRunTimeout passes an unchecked pinned value through (pinned 0 → 0), while effectiveTimeoutMs throws a TypeError for the same caller defect."
  evidence: "assert.deepEqual(resolveRunTimeout({ ok: true, exclude: [], timeoutMs: null }, 0), { ok: true, value: 0 }"
```

- The first is **fixed**: the detail now reads "the pinned --timeout-ms; the gates block declares none or is refused".
- The second is **declined, deliberately**. With no declaration the runners must behave exactly as 7.15.0 (AC1). On
  7.15.0, `entry-gates.mjs --start` accepted `--timeout-ms 000` (its parser allows 3–9 digits) and carried 0 through.
  A throw in `resolveRunTimeout` would turn that into a crash where 7.15.0 had none. Both callers' own argv parsers stay
  the place a bad pinned value is judged, and a test pins the pass-through. A human may overrule this at GATE 2.

## Proposed lesson

None. Each finding is a first occurrence, with nothing recurring about it, so L20's bar is not met.
