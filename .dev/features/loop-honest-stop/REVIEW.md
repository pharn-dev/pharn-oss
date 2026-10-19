# REVIEW — loop-honest-stop

**Floor first.** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. That is the only
guaranteed part of this review; every finding below is advisory model judgment over a `trust: untrusted` increment.
No instruction-looking content was found in the reviewed files.

Reviewed: the 21 build paths (`git diff d5453a17`), read against `PLAN.md` (with its GATE 1 and post-grill
amendments) and `GRILL.md`.

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** Each new claim either reduces to a floor primitive or is labelled advisory:
  - `CAP_MISMATCH`, `CAP_UNWITNESSED` and `ITER_OVER_CAP` are integer equality and comparison, `lstat`, and string
    equality of the schema and name. They sit in a checker that gates the commit, and they are bounded as agreement,
    never provenance.
  - `reconcile-inconclusive` is an own-key integer equality.
  - The exclusion lines and the commit paragraph are tested code over report fields; they gate nothing.
  - The instruction-set figure is labelled an ESTIMATE.
- **L-eval (P1).** No Capability or `enforces` changed; the floor agrees (GREEN).
- **L-trust (P2).**
  - Only ALLOWLIST tokens and digits reach the commit argv (tested with a backtick id and a negative count).
  - RUN-REPORT renders ids inline only after the allowlist test, and the instruction-set numbers only after
    safe-integer tests.
  - No refusal message quotes marker text: `markerCap`'s `why` is a fixed phrase plus the record's own directory
    name.
  - No guaranteed decision rests on free text.
- **L-axis (P3).**
  - `excludedFacts` sits beside the `excluded` block's writer in `gate-run-core.mjs`.
  - The marker schema is restated in `check-loop-decision.mjs`, because the floor never imports a hook, and a test
    pins it to the hook's `SCHEMA`.
  - No new sibling import.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/loop-closeout.mjs:307"
  problem: >-
    excludedGates' doc says it returns the union of both reports' exclusions, but `unlisted` is the larger side's count
    (a lower bound), not a union.
  evidence: "unlisted: facts.reduce((n, f) => Math.max(n, f.unlisted), 0)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/render-run-report.mjs:613"
  problem: >-
    The instruction-set block states as fact that the files ride in every request's prefix and are inside the input
    counts; that is Claude Code's loader behaviour, which this file models through check-instruction-files.mjs and
    does not measure.
  evidence: "Those files ride in the prefix of the run's requests, so they are already inside the input and cache counts above"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop.md:319"
  problem: >-
    The Step 1a line says an unusable estimate renders as n/a "in the report", but a --quick run renders no
    RUN-REPORT.md at all.
  evidence: "Any exit → go on: it never stops the run, and an unusable file renders as `n/a` in the report."
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/loop-closeout.mjs:61"
  problem: >-
    The header's step-13 comment was extended into one line far past the file's width, unlike every neighbouring line.
  evidence: "after step 3 into the document's `excluded_gates`; ALLOWLIST tokens and digits only), when there were any. Hooks run"
```

The `test` gate's red in `VERIFY.md` (runs 1 and 2) is not a finding against this increment. It is
`stage-regress.test.mjs:2207`, a 1.5-second timing test outside the build. It also failed at the base commit under the
same machine load and passes in isolation. It is recorded there, not dismissed: the stage verdict is FAIL until a run
with that test green.

## Verdict

**GREEN at the floor, 0 floor-gate findings; 4 advisory (all minor).** All four are cheap and clearly right, and they
are fixed in this increment before the final regress and verify (the fixes are recorded in `SHIP.md`).

## Proposed lesson candidate (not written to canon)

- `lesson: deferred` per the batch brief. Candidate text: _a fixed sub-second or few-second time budget in a test is a
  load-dependent verdict; under parallel agent runs it reds the base and the head alike, so a red baseline under load
  is a harness signal before it is a repo signal._ Source: this `REGRESSION.md` (base `tests` 1 on main) and
  `VERIFY.md` runs 1–2. Whether it clears L20's bar is for the maintainer: the flake is one test, seen three times in
  one session.
