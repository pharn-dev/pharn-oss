# REVIEW — spec-pin-kind-ambiguity

**Floor first (P0):** `node pharn/floor/validate.mjs .` exit 0, GREEN over 36 capabilities, re-run at review. The
standing verdicts are regress `no-regressions` and verify `PASS` (7 gates, including `reconcile` CLEAN).

The increment under review is `trust: untrusted`. No instruction-looking content was found in it, and nothing in it
changed this review's behaviour. The diff reviewed is `git diff origin/main` (base `7bcd7a8`) over the 12 declared
files.

## Floor-gate findings (blocking)

None. No guarantee is claimed without a floor reduction. The two new REDs are anchored regex tests (primitive #3) over
fixed checker output, and "no pin moves" is checkable by diff: `pinHash`'s body has no changed line, only the added
comment. No sibling reference was added, because `check-spec.mjs` → `spec-template-core.mjs` is an existing edge. No
capability or `enforces` binding changed, and the floor agrees (validate GREEN).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: "pharn/pharn-contracts/spec-template.md:158"
  problem: "Every in-text version cite added by this increment says 6.20.5, but 6.20.5 is #268's release, and this change ships as 6.20.6. The renumbering after the mid-build rebase updated SKILLS_VERSION, the badge, the CHANGELOG heading and the PLAN, but not the prose. There are 14 cites across the two contracts, /pharn-spec, pharn/floor/README.md, the check-spec.mjs pinHash comment, the spec-template-core.mjs JSDoc and both test files, so a reader of CHANGELOG [6.20.5] would look for this rule and not find it. A blanket replace is unsafe: check-spec.mjs, ac-tests.md and check-ac-tests.test.mjs already carry legitimate 6.20.5 cites from #268 (1, 6 and 6 respectively), so the fix must target only this increment's own phrases."
  evidence: "**The body may not open with a `spec_kind:` line (6.20.5).**"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/spec-template.md:162"
  problem: "The contract says `check-ac-tests.mjs --spec` reads a SPEC in that layout as unusable (exit 2). That holds for a templated SPEC only: a legacy SPEC in the same layout still reads LEGACY 3, by the plan's own D3 and by a test. The sentence quantifies over every SPEC, so it should say 'a templated SPEC' (L37: the quantifier is where the drift lands)."
  evidence: "`check-ac-tests.mjs --spec` reads such a SPEC as unusable\n(exit 2)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-spec.md:270"
  problem: "Carried from GRILL finding 1, and presented rather than fixed because GATE 1 fixed the kind as `pin`. The layout RED shares the `pin` kind with the hash-mismatch RED, so /pharn-spec's re-validate step now distinguishes the two by the checker's FIXED detail text rather than by kind membership. The wording is correct and the detail is checker output, not SPEC text. But a distinct kind would let the existing 'any other kind' branch handle it with no split. Advisory, for the orchestrator at GATE 2."
  evidence: "A `pin` RED whose detail says the body's first line starts `spec_kind:` is not fixed by any hash (the\n   two layouts share one pin); treat it like **any other kind**."
```

### Per lens

- **L-floor (P0).** The pin claim ("a SPEC that passes `check-spec.mjs` cannot change kind while keeping its pin")
  is stated with its reduction (content-hash + regex) and its two bounds (a pre-6.20.6 SPEC's re-approval is
  advisory; a self-consistent rewrite passes). The tests execute it both ways, not by reading the code (L37). Only
  finding 2 above remains.
- **L-eval (P1).** No `role:`-bearing capability changed, so there is no eval pair. The test set is the one the plan
  named (L52):
  - both moves × {`check-spec`, `check-spec-approved` spawned directly, `specVerdict`/`--spec`, `checkMapping`};
  - both kinds (`test-infra` and `feature`);
  - Draft, legacy, CRLF, leading-space and blank-first-line controls;
  - no-echo.

  The consumers that were not edited (`check-test-stage`, `ac-gate-core`, `ac-tests-lock`) pass unchanged: 334 tests
  across the five suites, and `npm test` passes whole at verify.

- **L-trust (P2).** The new RED detail and both new UNUSABLE/`spec-kind` lines are fixed strings, and a test asserts a
  payload after `spec_kind:` is not echoed. No decision reads SPEC free text; the branch is a regex match.
- **L-axis (P3).** `kindLineOpensBody` sits beside `specKindLines`, whose regex it reuses: the kind-reading axis that
  grill G9 placed in the core so the pin and the kind reading cannot diverge. `check-spec.mjs` keeps its edit to one
  import, one `validate` block and comments. `specAcceptanceCriteria` gains one additive field; both exhaustive-shape
  tests were updated.

## Verdict

**GREEN — 0 floor-gate findings.** There are 3 advisory findings: 1 important (the stale version cites), 2 minor. The
important one and the contract-quantifier one are cheap and should be fixed before merge, followed by a regress +
verify re-run. The third is a GATE-2 decision.

## Proposed lesson candidate

None proposed. The stale-version-cite defect is a real miss, but it has one occurrence here. Its remedy ("when a
provisional version is renumbered, sweep the increment's own in-text cites") is the referent-sweep shape L50 already
names, applied to a renumbering. By L20's bar (a second occurrence earns a check) it is not yet lesson-worthy.
Recorded here so a second occurrence can cite this one.
