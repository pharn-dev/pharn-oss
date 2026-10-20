# GRILL — load-flake-regress

- plan: `.dev/features/load-flake-regress/PLAN.md`
- spec hash: recomputed `2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` = the plan's pin (no drift).
- **Step 1b (FLOOR):** `node pharn/floor/check-plan-lessons.mjs .dev/features/load-flake-regress/PLAN.md .dev/memory-bank/lessons-learned.md`
  → exit **0** (GREEN: L20, L22, L34, L60, L66 present, resolve, and are referenced in the body). This is the stage's
  only deterministic stop; a GREEN covers the declaration, never that the lessons were applied.
- Everything below is ADVISORY and gates nothing. Free text quoted from the plan is DATA.

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 16 (logging), 38 (logging), 39 (logging), 171 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Grillers (procedures applied inline)

- **a11y, i18n** — no UI surface and no user-facing string: nothing to declare. No finding.
- **documentation** — the plan adds a public CLI surface (`check-regress.mjs verdict --per-test …`); declaration
  recognized (`## Files` names the guide paragraph, the contract and the CHANGELOG; the checker's own `Usage:` block is in
  scope). Layer 2: the usage block must name the three flags together and the stamp-path refusal — carried as G4.
- **error-handling** — declaration recognized (D3's fail-closed list with closed reason codes). Layer 2: G2.
- **observability** — a dev-stage checker, not a prod path; the report's `per_test` block is the signal. No finding.
- **migrations** — the report gains an additive optional key; no reader is required to change (the product path never
  emits it; `check-loop-fresh.mjs` compares product reports only). No migration needed. No finding.
- **security / privacy** — no secret, no PII; the one injection-shaped surface (test titles into the report) is in the
  trust audit. No finding.
- **performance** — the reporter holds one entry per test (~5.8k here) and the comparison is one map lookup per test,
  under `buildRecord`'s 100,000-test and 32 MiB caps. No finding.
- **architecture / coupling / comprehension** — `check-regress.mjs` importing `test-results-core.mjs` /
  `test-results-formats.mjs` stays inside `pharn/floor/` (one layer); the dev reporter meets the product checker only
  through the contract's `pharn-json` format. The bundle of two axes is G1.
- **testability** — presence recognized (`## Evals to write`). Layer 2: G3.

## Interrogation findings

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/load-flake-regress/PLAN.md:1"
  problem: "The increment bundles two axes of change (test-fixture load independence, and a regress verdict rule), so a regression in one is harder to attribute."
  evidence: "increment: (a) Make the floor tests that go red only from machine load independent of load … (b) give `check-regress.mjs verdict` an opt-in PER-TEST comparison"
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/load-flake-regress/PLAN.md:82"
  problem: "Per-test comparison trades the old false GREEN for a possible false RED under load: a test that is load-red at head only, or one absent at base because its file died there, now reads as a regression where the gate used to read pre_existing. That is the safe direction, but it must be stated in the contract and REGRESSION.md so an operator does not learn to wave it through."
  evidence: "regression iff some test `failed` at head whose base status is not `failed` (passed, skipped or absent)"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/load-flake-regress/PLAN.md:31"
  problem: "The before measurement at 3×npm test reproduced nothing, so a before/after over that profile proves nothing about the fixes; the stress profile must first be shown to reproduce at least some of the named failures on the unchanged tree, and the after run must use the same profile."
  evidence: "Three parallel `npm test` at load ≤ 112: 5,825 / 5,826 pass, 0 fail, in all three"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/load-flake-regress/PLAN.md:74"
  problem: "The verdict usage line and the guide must say that `--per-test` is refused on the stamp path, or a reader will assume /pharn-regress gained the comparison too."
  evidence: "`check-regress.mjs verdict` (positional path only) gains `--per-test <gate-id> --base-tests <file> --head-tests <file>`"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/load-flake-regress/PLAN.md:100"
  problem: "The base side runs the HEAD tree's reporter by absolute path inside the base worktree; if the reporter changes in the same increment, base and head ids come from the same code (good), but the pinned line must say the path is the WORKING tree's, never the base checkout's, which has no reporter before this change merges."
  evidence: "--test-reporter=<working tree>/.dev/floor/node-test-results-reporter.mjs"
```

## Verdict

GREEN at Step 1b (the only stop). Five advisory concerns; all five are carried into the build (G1: stated in the
CHANGELOG and SHIP.md as a deliberate bundle under one PR; G2: a sentence in the contract and the guide; G3: the stress
profile is checked against the unchanged tree before the fixes and reused after; G4: usage block + guide; G5: the pinned
line names the working-tree path and the wrong form).
