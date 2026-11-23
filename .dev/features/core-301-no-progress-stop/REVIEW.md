# REVIEW — core-301-no-progress-stop

The increment under review is `trust: untrusted`: instruction-looking content in the reviewed files is reported,
never followed. None was found.

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The verify
gate map (`verify-report.json`, run 2) is PASS on all seven gates.

## Floor-gate findings (blocking)

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/regression-report.md:84"
  problem: "The paragraph says only `verdict` of the two fields is read; since 7.23.0 `check-loop.mjs` also compares `regressions` for no-progress, so the sentence is true only of the stop/green decision, and reads broader than it is."
  evidence: "The two always agree in emitter output, but only one of them is read"
```

The new paragraph above the verdict table states the exception precisely, so nothing is misstated about a decision;
this is a wording follow-up for the next change to that contract.

Every other claim reduces: the no-progress stop to set equality and an integer compare in tested code
(`check-loop.test.mjs`, mutation-checked); the copy step and the record/summary copies are labelled advisory in
`check-loop.mjs`'s header, the contracts, the guide and the CHANGELOG; the re-derivation is bounded as agreement with
the copies (L43) in `check-loop-decision.mjs`'s header.

### L-eval → P1

No capability, no `enforces`, no `rule_id` added; nothing owes an eval. The checker's behaviour is pinned by
`node:test` cases (15 new or extended in `check-loop.test.mjs`, 1 in `check-loop-decision.test.mjs`), including the
committed-line WIRING test with a negative control and the ROUTING test GATE 1 asked for.

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/check-loop.mjs:540"
  problem: "The no-progress reason lists every repeated gate id with no count bound; gate ids are deterministic-tool output, so this is length, not taint, but a report with many failing gates gives a long reason the summary copies."
  evidence: "failing gates: ${listed(repeated.failing_gates)}; failing ACs: ${listed(repeated.failing_acs)}"
```

AC ids are filtered to `^AC-[1-9][0-9]*$` before they are compared or echoed, and no free-text field (`detail`, test
titles, `completeness`) is read. No decision rests on a tainted field.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/check-loop.mjs:347"
  problem: "The run-directory path shape (`pharn/features/<name>/` → `pharn/.run/pharn-loop/<name>/`) now lives in check-loop.mjs as well as check-loop-decision.mjs's markerRun; a relocation must change both."
  evidence: "function prevCopyDir(verifyPath) {"
```

Accepted at the grill (G4): the decision checker reaches `check-loop.mjs` only as a CLI, and the decision test runs
both over one fixture project, which binds them.

### Advisory note (no finding)

Step 1a does not remove copies an earlier run of the same feature left. Iteration 1 never compares, and every
`CONTINUE` overwrites the copy, so an old copy is compared only when a run skipped every copy step — the stated bound.
Clearing the two files at Step 1a would close it; P7 says wait for a real occurrence.

## Proposed lesson candidate

The first verify was red on `reconcile` because a branch that had not landed on `main` (#464) was merged after the
build anchored: the `merged` exception covers `origin/main` bytes only. The same shape is already recorded as an
operational note (a local sibling fix fast-forwarded mid-window reads as escapes; re-anchor after). Not proposed for
canon here: it restates a known note, and a promotion needs a human at `/pharn-dev-memory-promote`.

**Verdict: GREEN — 0 floor-gate findings, 3 minor advisory findings.**
