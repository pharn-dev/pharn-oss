# GRILL — regress-per-test-product

Plan: `.dev/features/regress-per-test-product/PLAN.md` · spec-hash check: recomputed
`d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf` = the plan's pin (no drift) · Step 1b lessons
declaration: **GREEN** — `check-plan-lessons.mjs` exit 0 (L34, L35, L36, L41, L43, L58, L60, L62, L81, L84 all resolve
and are referenced in the body; NOTE (P0): the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 102 (logging), 103 (logging), 202 (logging). Not a finding:
  whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/regress-per-test-product/PLAN.md:90"
  problem: "check-regress.mjs (a verdict core whose header says it spawns no child process) would import base-worktree.mjs, which imports stage-runtime.mjs and so node:child_process — the core's import graph grows into the execution layer for one pure string test."
  evidence: "`baseCheckoutRelative(p, projectReal, root = tempRoot())` (pure): ... The naming rule stays in its one owner (L35)."
```

Resolution to weigh at build: importing is not spawning, so the header claim stays true; the alternative is a pure
naming module. Either keeps one owner; the build should say which it chose and why.

### Coupling (P3/P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/regress-per-test-product/PLAN.md:65"
  problem: "The verdict now depends on a live file outside the two stamps (pharn.config.json's testResults), so check-loop-fresh E's re-run agrees only while that file is unchanged between regress and the freshness check; the plan does not state this ordering."
  evidence: "Reads `testResults` from `<cwd>/pharn.config.json` (`loadResultsConfig` + `formatFor`)."
```

The existing AC gate has the same dependency (it reads the config at verify and at E), so this is a stated bound,
not a new class — the contract should say it.

### Inline — guarantee audit / honest scope (P0, P7)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/regress-per-test-product/PLAN.md:66"
  problem: "A malformed testResults block turns a both-red `test` from pre_existing into inconclusive; the plan's 'projects without the opt-in keep today's behaviour' is true only if a malformed block counts as an opt-in, which it should say."
  evidence: "`config-invalid` → `inconclusive` `per-test-record-refused`."
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/regress-per-test-product/PLAN.md:198"
  problem: "The realistic-input test (L84) is described as 'absolute report paths' but no reporter is named; vitest is not a dependency here, so the e2e test should use a reporter script writing absolute paths and a unit test should run a captured vitest report (test-fixtures/test-results/) through the base-path mapping."
  evidence: "Base paths: a vitest-json record with absolute paths under a `pharn-regress-base-<tag>-xxxxxx` root reads as the head ids (unit, and end to end through `stage-regress.mjs` with a real base worktree"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/regress-per-test-product/PLAN.md:99"
  problem: "The entry slot id is `base:test`; the plan assumes resultsFileName handles a colon id identically on both sides of the copy but does not say it checked that the entry run actually wrote and hashed a results file for that slot."
  evidence: '`resultsFileName(src.seq, "base:test")` → `resultsFileName(seq, "test")`, sha256 = the entry run''s `results_sha256`'
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/regress-per-test-product/PLAN.md:112"
  problem: "New refusal reasons reach REGRESSION.md, which /pharn-loop commits; the plan must keep them free of absolute paths (the base checkout path, the project root), as G10 requires for everything the stage renders."
  evidence: '`render-regression.mjs`: a "Per-test comparison" section when the report has `per_test`'
```

### Grillers with no finding (reason)

- a11y, i18n — no UI or user-facing text; scanner clean.
- comprehension — the non-obvious choices (domain from the HEAD stamp, read only in the both-red row, entry carriage)
  each carry their WHY in the plan and the GATE 1 record.
- documentation — the contracts, the command paragraph and the guide are declared.
- error-handling — every failure is a closed reason code with a stated direction (fail-closed).
- migrations — no persisted schema; the stamp change is additive and `SCHEMA` is unchanged.
- observability — the `per_test` block, its render and the reason codes are the observation surface; the scanner's
  "logging" hits are incidental (log-file digests).
- performance — at most two results files (≤ 32 MiB each) are read, only in the both-red row; check E reads them once
  more. Bounded.
- privacy, security — scanners clean; untrusted ids stay data, fenced in the render (the trust audit).
- testability — present: per-AC tests, an L60 mutant, an e2e test.

## Summary

The plan is coherent and smaller than the ticket's file list (no `run-gates.mjs` change, with the reason). The two
important concerns are structural: the verdict core's import graph, and the new live input (the config) that check E
must see unchanged. The minors ask for statements in the contract and specific test inputs.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor) — for the human to weigh before
/pharn-dev-build. This verdict covers the interrogation only; it is not a judgment that the plan is sound.
