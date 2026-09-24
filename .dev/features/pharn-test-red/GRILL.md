# GRILL — pharn-test-red

Plan: `.dev/features/pharn-test-red/PLAN.md` (approved at GATE 1 by the model under the user's overnight delegation,
2026-09-24 — a delegated model decision, never a human approval). Spec-hash check: `pharn/ARCHITECTURE.md` digest
`edc3d07d…ce091a5d2c` **equals** the pin. **Step 1b lessons-declaration verdict (FLOOR): GREEN**
(`check-plan-lessons.mjs` exit 0). That covers the DECLARATION only.

Method: the inline Step-2 axes and the 13 registered grillers, applied inline, below. An independent read-only agent
was launched on the same plan; the user asked to keep going, so the build starts on this grill, and the agent's
findings are folded in as a recorded plan amendment when they arrive (the item-03 review precedent). All findings are
advisory (fix #3).

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pharn-test-red/PLAN.md:62"
  problem: "`spec_kind` sits in the frontmatter, outside the body hash, so an Approved SPEC can be flipped to `test-infra` after approval without drift — turning a feature's test-first run into a no-run bootstrap. Same class as item 03's `spec_template` finding; must be stated, and the lock's `mode` recorded so a later check can compare."
  evidence: "An optional SPEC frontmatter key `spec_kind` ∈ {`feature` (absent), `test-infra`}"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/pharn-test-red/PLAN.md:46"
  problem: "The `test` gate receives mapped file names as argv after `--`; a mapped file whose name starts with `-` would reach the runner as a FLAG through npm's argument pass-through. The mapping checker's bad-path rule must refuse a leading `-` segment."
  evidence: "The `test` gate is handed exactly the unit/integration mapped files, through the existing file-append path"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/pharn-test-red/PLAN.md:88"
  problem: "'for the right reason' overstates what the record can see: a test failing on a typo in its own body is `failed` too. The collected/not-collected split is the only reason the record distinguishes; the contract must say so (the plan's audit does)."
  evidence: "the red run … require each to fail for the right reason"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/pharn-test-red/PLAN.md:55"
  problem: "When both `test:e2e` and `e2e` exist, an e2e AC's test may be reported by both gates; the verdict must union the matches across the level's gates and require EVERY gate's record to be available, or one unconfigured gate silently shrinks the evidence."
  evidence: "over `testRecord` for every gate its level maps to"
```

## Grillers (13 registered)

`security`: the flag-injection finding above. `privacy`, `a11y`, `i18n`, `migrations`: no surface. `performance`: the
red run adds one run of the AC tests (the `test` gate restricted to their files; e2e gates whole) per `/pharn-test`
run. `testability`, `error-handling`, `architecture`, `coupling`, `comprehension`, `documentation`, `observability`:
coincide with the findings above.

## Summary

The design reuses items 01–03 cleanly; the concerns are a frontmatter key the pin cannot see, a flag-injection path
through the file append, and two wording/union details. All four are addressed in the build.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this count.

## Independent grill (read-only agent, completed after the build started)

The agent verified every "correcting the record" claim and the plan's baseline TRUE, and raised 13 findings: 2
blocking, 6 important, 5 minor. All are adopted as the PLAN's **Amended after grill** section (G1–G13), before any
floor code depending on them was written. The two blocking ones:

- **G1:** `--record-red-run` recorded evidence bound to the CURRENT files, not to the run that produced it. A stale
  `stamp.json` from tests v1 would survive a rewrite to v2 and be recorded against v2. Fix: validate the stamp as
  `ac-test` for this feature, require each run's files to equal the mapping's, and require the live fingerprint to
  equal `stamp.fingerprint.final`.
- **G2:** `spec_kind` sat outside the approval pin, so an Approved feature SPEC could be flipped to `test-infra`
  (no tests, no red run) with nothing on the floor noticing. Fix: the pin covers a `spec_kind:` line when present
  (no existing pin moves), a mapping for a test-infra SPEC is RED, and `--model-approve` never writes `test-infra`.

The important ones: G3 (the bootstrap lock needed a defined closed shape), G4 (a leading-`-` mapped file reaches the
runner as a flag), G5 (`--gates`/`--extra`/… not refused at ac-test; a missing level silently shrank the set), G6
(the e2e suite run whole makes one unrelated flaky test fatal), G7 (importing a `check-*.mjs` CLI breaks the P3
precedent), G8 (a GREEN `--check` does not mean the red run happened).

ADVISORY VERDICT (combined): 17 concerns (2 blocking, 8 important, 7 minor), all adopted into the plan.
