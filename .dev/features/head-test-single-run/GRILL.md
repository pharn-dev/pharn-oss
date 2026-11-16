# GRILL — head-test-single-run (CORE-89)

Plan: `.dev/features/head-test-single-run/PLAN.md` · spec-hash: `d19c3ae5…` equals `pharn/ARCHITECTURE.md` (no drift) ·
Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0; 12 cited ids resolve and are referenced).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 60 (logging), 123 (logging), 126 (logging), 257 (logging). Not a
  finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

The interrogation and the griller procedures were applied by an independent read-only reviewer agent over the plan
and the live code; its findings are quoted below as DATA (free text inherits the plan's untrusted tag). The build's
disposition follows each one; dispositions are the building agent's, inside the approved `## Files`.

### Interrogation axes

```yaml
- type: FINDING
  rule_id: P5
  severity: blocking
  file: ".dev/features/head-test-single-run/PLAN.md:107"
  problem: "With Q2(a), the case Q3 is meant to handle (a HEAD red owned only by inside tests) becomes inconclusive whenever the BASE `test` record is unavailable — always when outside_tests is empty (BASE is no-files and gateResults refuses `results-unavailable`) and whenever the base commit lacks the reporter; check-loop maps it to a terminal stop."
  evidence: "Both records are read whenever HEAD `test` is red (**Q2**): base 0 / head red compares against the BASE record too, so a base commit with no record is `per-test-record-refused`"
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/head-test-single-run/PLAN.md:124"
  problem: "If the results file is copied into verify's results path and the reuse then misses, the copy stays there and the fresh run can record the regress copy's digest when its reporter writes nothing."
  evidence: 'copies the source''s results file to verify''s own `resultsFileName(seq, "test")` … a failure is the existing `log-unverified` miss (the gate then runs).'
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/head-test-single-run/PLAN.md:93"
  problem: "The stamp is said to decide the mode, but stampPerTest is gated first on the live config; a whole-suite HEAD stamp with the config off would fall back to the raw exit table and read an inside-only red over a green base as `regressions`."
  evidence: 'When the HEAD stamp''s `test` run carries `compare_files` (the "whole-suite mode"; the stamp alone decides it, so check E re-derives it)'
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/head-test-single-run/PLAN.md:267"
  problem: "After the decision, gateResults and check J bind the copy to verify's own stamp digest only; nothing re-binds it to the source run, and validateStamp cannot see that a reused verify `test` came from a whole-suite source."
  evidence: "the copy verified against the source's `results_sha256`, re-checked by `gateResults` and check J"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/head-test-single-run/PLAN.md:264"
  problem: "A whole test suite can read fingerprint-excluded feature artifacts (REGRESSION.md is written after the HEAD drain) — the reason style gates are never reused — so an equal identity is not an equal input; the audit names only determinism and flakiness."
  evidence: "that the reused result equals a fresh run is ADVISORY (determinism, flakiness — the lost second sample, stated)."
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/head-test-single-run/PLAN.md:243"
  problem: "No test planned for: empty compare_files with HEAD red; a whole-suite stamp with the config off at verdict time; a reuse miss after the results file was copied."
  evidence: "head red with no failed test anywhere → `per-test-unaccounted-red`; base record absent with head red → `per-test-record-refused`."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/head-test-single-run/PLAN.md:33"
  problem: "The saving per iteration is the outside-subset duration (HEAD used to run that subset), not the whole-suite 286 s, and the HEAD run grows by the inside tests."
  evidence: "about 286 s per iteration on the measured project, and one of the two chances per iteration to hit the 540 s timeout."
```

### Griller findings

```yaml
- type: FINDING # performance
  rule_id: P7
  severity: minor
  file: ".dev/features/head-test-single-run/PLAN.md:139"
  problem: "A standalone /pharn-regress (no offer) or a verify miss now pays a whole suite at HEAD with nothing saved; not in the trades list."
  evidence: "### Recorded trades and bounds (stated in the contracts, the CHANGELOG and LIMITS §9)"
- type: FINDING # comprehension
  rule_id: P7
  severity: minor
  file: ".dev/features/head-test-single-run/PLAN.md:111"
  problem: "BASE counts suite errors over the compared files only and HEAD over every file, so any inside-file suite error reads as a regression — the common case, not an edge."
  evidence: "Suite errors carry no file in any supported format, so a suite error in an inside file can still read as a regression — a false RED, stated."
- type: FINDING # documentation
  rule_id: P7
  severity: minor
  file: ".dev/features/head-test-single-run/PLAN.md:197"
  problem: "The orchestrator's Q3 addition (regression-report.md and the CHANGELOG state that an inside-only HEAD red is not a regression) is not named in the Files lines."
  evidence: "`pharn/pharn-contracts/regression-report.md` — the whole-suite mode of `per_test`, `head_run`, trades"
```

coupling: covered by the P5 finding at line 93. architecture, error-handling (beyond line 124), observability (the
scanner's "logging" hits are log-file copies; `reuse_miss`, `head_run` and the rendered lines are adequate), testability
(gaps in the P1 finding), security, privacy, a11y, i18n, migrations: no findings.

## Summary

The reviewer confirmed against live code: the identity matches (`npm run test` with no `--` on both sides, same timeout,
head, cwd and stage-neutral fingerprint); `baseSpecFrom` projects explicit fields, so the entry-derived and retained BASE
paths keep their bytes and the empty case maps to `no-files` as today; stage-work and gate-durations count reuse
generically; checks G, J and E hold; entries persist whole, so `compare_files` survives `run --next` and resume.

### Build dispositions (inside the approved `## Files`; Q1–Q6 unchanged)

- **L107 (blocking) — fixed by narrowing when the BASE record is read**, keeping Q2(a)'s intent (read both records
  whenever the BASE side can change the answer): a HEAD red with no failed test in a compared file and no suite error
  is classified without the BASE record (nothing at HEAD can be new), and a BASE `test` run recorded `no-files` is
  read as an empty record (nothing ran there) instead of being refused. A BASE record that should exist and does not is
  still `per-test-record-refused`. Tested: empty `compare_files` + inside-only red → no regression; base without a
  record + inside-only red → no regression; base without a record + an outside failure → refused.
- **L124 — fixed:** the results file is copied after both logs verify, and any miss after it clears verify's results
  path again before the gate runs. Tested.
- **L93 — fixed:** in whole-suite mode a red HEAD with `testResults.test` off or unreadable is `per-test-record-refused`
  (the record cannot be read), never the raw exit table. Tested.
- **L267 — wording fixed:** the copy is bound to the source's digest when the decision is made; afterwards
  `gateResults` and check J bind it to verify's own stamp digest only, and `validateStamp` cannot see the source's mode —
  stated in `gate-run-record.md` under the existing residual `verify-reuse-rederive`.
- **L264 — stated** as a bound in `gate-run-record.md` / `verify-report.md`: a suite reading fingerprint-excluded feature
  artifacts (REGRESSION.md) can see different bytes at verify than at regress.
- **L243 — the three tests are added** (above).
- **L33, L139, L111, L197 — stated** in the CHANGELOG, the contracts and `SHIP.md`: the saving is the outside-subset run
  (about the whole suite minus the inside tests), a standalone regress pays the whole suite, inside-file suite errors
  read as regressions, and the inside-only rule is written out in `regression-report.md` and the CHANGELOG.

ADVISORY VERDICT: 10 concerns raised (1 blocking-severity, 9 advisory) — for the human to weigh before /pharn-dev-build.
The Step 1b lessons-declaration verdict (GREEN) is a separate floor verdict and is not counted here.
