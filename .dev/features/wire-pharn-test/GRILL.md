# GRILL — wire-pharn-test

Plan: `.dev/features/wire-pharn-test/PLAN.md` (approved at GATE 1 by the model under the user's overnight delegation,
2026-09-24 — a delegated model decision, never a human approval). Spec-hash check: `pharn/ARCHITECTURE.md` digest
`edc3d07d…ce091a5d2c` **equals** the pin. **Step 1b lessons-declaration verdict (FLOOR): GREEN**
(`check-plan-lessons.mjs` exit 0). That covers the DECLARATION only.

Method: the inline Step-2 axes and the 13 registered grillers, applied inline, below. An independent read-only agent
was launched on the same plan; its findings are folded in as a recorded plan amendment when they arrive (the item-04
precedent). All findings are advisory (fix #3).

## Findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/wire-pharn-test/PLAN.md:48"
  problem: "check-test-stage shells ac-tests-lock --check, which resolves test-file paths against its CURRENT directory; check-loop-fresh runs from `--repo`. The new checker must run its children with cwd = the project root the caller names, or a loop-fresh call from another directory reads every pinned test as missing."
  evidence: "It SHELLS the three existing checkers"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/wire-pharn-test/PLAN.md:57"
  problem: "The build gate runs on every /pharn-loop iteration and on /pharn-ship's Step-2b retry, AFTER code was written. It must still pass there: the lock pins only the AC tests, and the mapping check reads SPEC, PLAN and AC-TESTS.md, none of which the build may write. State that, and test the post-build case, or iteration 2 could refuse its own rebuild."
  evidence: "/pharn-build refuses without it"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/wire-pharn-test/PLAN.md:75"
  problem: "'the commit holds the pinned tests' is only as good as the builder's read of the lock; a lock whose files[] names a path outside the repo or a symlink must be dropped by the same regular-file / not-ignored filter the plan's paths go through."
  evidence: "Step 6c stages `AC-TESTS.lock.json` and the lock's own `files[].path`"
```

## Grillers (13 registered)

`security`: the staging-path filter above. `privacy`, `a11y`, `i18n`, `migrations`: no surface. `performance`: the
gate adds three child processes per build and per freshness check (a few hundred ms). `testability`,
`error-handling`, `architecture`, `coupling`, `comprehension`, `documentation`, `observability`: coincide with the
findings above.

## Summary

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 2 important, 1 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this count.

## Independent grill (read-only agent, completed after the build started)

The agent verified all six "correcting the record" claims TRUE and raised 11 findings: 2 blocking, 4 important, 5
minor. All are adopted as the PLAN's **Amended after grill** section (G1–G11), before the dependent code and commands
were written. The blocking ones:

- **G1:** in bootstrap mode the gate ran only the lock check, and a `test-first` lock's check never reads SPEC.md, so a
  SPEC re-approved as `test-infra` beside an old test-first lock read `READY bootstrap`. Fix: the gate compares the
  lock's `mode` with the SPEC's (`lock-mode-mismatch`).
- **G2:** `NOT-APPLICABLE` is decided by `spec_template`, which the pin does not cover, so deleting the key and both
  files skips the test stage. Fix: `/pharn-loop` accepts only `READY *`; the remaining bound is stated.

The important ones: G3 (spine strings and ordinals in five more commands), G4 (in-flight features newly refused; the
MINOR bump argued and the remedy stated), G5 (S12 decided by the checker, not by relayed text), G6 (Step 6c silently
dropping a pinned test).

ADVISORY VERDICT (combined): 14 concerns (2 blocking, 6 important, 6 minor), all adopted into the plan.
