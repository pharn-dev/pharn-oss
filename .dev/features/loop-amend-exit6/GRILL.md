# GRILL — loop-amend-exit6

Plan: `.dev/features/loop-amend-exit6/PLAN.md`. Spec hash: `d19c3ae5…` matches `pharn/ARCHITECTURE.md` (no drift).
Step 1b lessons declaration (`check-plan-lessons.mjs`): **GREEN** (exit 0; L29, L36, L64, L68 resolve and are referenced).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Inline interrogation

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-amend-exit6/PLAN.md:81"
  problem: "The closure test must fold whitespace before it looks for the exception: `## Running a stage` already wraps one instance across a line break (\"(its exit\\n`6` excepted\"), so a per-line or exact-substring match would fail on a sentence that is correct."
  evidence: 'closure: every occurrence of "`finish` printed" or "its `finish` read" in `pharn-loop.md` has "exit `6`" in the same sentence'
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-amend-exit6/PLAN.md:81"
  problem: "The set the closure ranges over is `pharn-loop.md` alone; `/pharn-loop` also loads `pharn-loop-quick.md` and `pharn-loop-close.md`. Neither routes a `finish` read today (measured: zero hits for either stem), so ranging over all three costs nothing and covers a later branch there (L29)."
  evidence: 'every occurrence of "`finish` printed" or "its `finish` read" in `pharn-loop.md`'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-amend-exit6/PLAN.md:91"
  problem: "The closure's bound is stated in the guarantee audit; it should also travel with the test's own header comment, so a reader of the test does not read 'every routing sentence' as every sentence that routes a finish read in other words (L64)."
  evidence: "it covers the two stems it collects, not a sentence that routes a `finish` read in other words"
```

### Griller axes

- **testability:** presence recognized (`## Evals to write (P1)` names the closure test, its control and two pins).
  Adequacy: the control (the 7.10.0 sentence spliced back in fails) is the right negative; see the two minor findings
  above on whitespace and the set ranged over.
- **error-handling:** the change IS an error path (a capped stage wait); the plan names both outcomes (`6` → S9b, any
  other non-zero → S18). No finding.
- **architecture / coupling:** fit recognized — the contract restatement is corrected in its own file (P4), no new
  cross-module reference.
- **documentation / comprehension:** the plan says why (CodeRabbit's finding, the 7.10.0 grill's G1 widened by the
  build). No finding.
- **security / privacy / i18n / a11y / migrations / observability / performance:** not applicable — no input, data,
  user-facing text, schema, runtime or hot path changes; the scans agree.

## Summary

The plan is small and its routing rule is a membership test over exit codes. The three concerns are about the new test:
fold whitespace (one existing correct sentence wraps the exception across a line), range the closure over all three
`/pharn-loop` parts, and state the stems-only bound in the test's own comment. The trusted-doc wording is sequenced
before the build's anchor (L68), and the replacement texts match what `checkAmend` compares (section lines, headings and
trailing blank lines aside).

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory, all minor) — for the human to weigh before
/pharn-dev-build.
