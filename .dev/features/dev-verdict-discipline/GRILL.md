# GRILL — dev-verdict-discipline

Plan: `.dev/features/dev-verdict-discipline/PLAN.md` · spec-hash check: `d5a97430…f64f33a5` recomputed with
`.dev/floor/hash-doc.mjs` = the plan's `spec_content_hash` (no drift) · **Step 1b lessons-declaration verdict (FLOOR):
GREEN** — `check-plan-lessons.mjs` exit 0, "all 13 cited id(s) resolve … and are referenced in the plan body".

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 185 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — every one rests on judgment; none gates `/pharn-dev-build`)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/dev-verdict-discipline/PLAN.md:100"
  problem: "The REPORT_MISMATCH rule requires gate_run.stamp_sha256 in the committed verify-report.json, but the stamp it hashes lives in gitignored pharn/.run/, so at PR time the field is a shape check only and a hand-typed block passes; the checker header and the command must say 'carries the stamp path's block', never 'came from a stamp'."
  evidence: "lacks the stamp path's `gate_run.stamp_sha256`"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/dev-verdict-discipline/PLAN.md:93"
  problem: "check-ship-record runs the PR's own copy of itself and of ci.yml (as check-surface-bump states for itself), so a PR can weaken the rule it is judged by; with no human review on gate-path PRs (axis 0 HIGH #1) that bound must be printed in the checker's NOTE and header, not left implicit."
  evidence: "a new per-PR dev check, `check-ship-record.mjs`, REDs a pull request that changes product surface"
```

### Determinism / error handling (P5, P7)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/dev-verdict-discipline/PLAN.md:51"
  problem: "The plan pins 'until it exits 3' for run --next, but the runner's header says exit 0 also covers 'none remained to claim'; the build must read the runner's exit rule and pin the exact loop condition (which exit finalizes the stamp, which means done), or the command can stop one call early and check-verify reads an unfinalized stamp (INCONCLUSIVE — fail-closed, but a wasted run)."
  evidence: "once per Bash call (timeout 600000) until it exits 3"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/dev-verdict-discipline/PLAN.md:55"
  problem: "Today the command captures reconcile's JSON at pharn/.run/pharn-dev-verify/reconcile.json and tells the reader to read escapes[] there; under the runner that output lands in the runner's per-gate log, so the command must name the new path or the 'read escapes[]' instruction points at a file that no longer exists."
  evidence: "The runner injects `instruction-growth` and `reconcile` (last, argv `check-bash-reconcile.mjs --base . --require-baseline`"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/dev-verdict-discipline/PLAN.md:51"
  problem: "npm test under host load has measured near the 540-570 s range (loop-cost-measurement memory); a timed-out test gate now reads INCONCLUSIVE gate-not-measured, a STOP. The plan should say that this is the expected outcome under load and that the remedy is a re-run, not a raised timeout above the Bash tool's 600 s cap."
  evidence: "--timeout-ms 570000"
```

### Architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/dev-verdict-discipline/PLAN.md:90"
  problem: "check-ship-record.mjs imports parseArgs/readBase/isProductSurface from its sibling check-surface-bump.mjs; there is precedent (check-surface-bump imports check-changelog-entry), and both are .dev/floor apparatus, so this is the established pattern rather than a new leaf-to-leaf edge — recorded so review checks the import stays one-way."
  evidence: "reusing `check-surface-bump.mjs`'s `parseArgs`, `readBase` (the PR's net diff ∪ untracked) and `isProductSurface`"
```

### Testability (P1)

Presence recognized: `## Evals / tests to write` names a fixture per refusal state, a wiring test that executes the
committed line, and hygiene pins with mutants. Layer 2: adequate; one gap below.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/dev-verdict-discipline/PLAN.md:161"
  problem: "The hygiene pins check that pharn-dev-verify.md's verdict line carries --stamp, but nothing pins that the init line's --gates set still contains the five style/test/validate ids; a later edit dropping lint:md from --gates would keep every pin green while the verdict loses L9's style coverage (coverage-violation only guards the ids the init line itself declares)."
  evidence: "pharn-dev-verify.md's verdict line carries `--stamp` and no `results.json`/`printf` assembly"
```

### Not applicable

a11y, i18n, migrations, privacy: no UI, user-facing strings, schema or personal data. observability: the scanner's
line-185 hit is the word "logging" in the gate-log trust note; the checker's output is its stdout verdict, which is
the observability a CI check needs — no concern. performance: one extra `git diff` and a few small file reads per PR;
dev verify adds ~0.5 s of fingerprinting per gate. security: scanner clean; the one untrusted input (PR-controlled
SHIP.md and report JSON) is covered by the plan's trust audit. comprehension / documentation: the plan names every
doc it changes (CLAUDE.md, CONTRIBUTING.md, both guides). error-handling: covered by the two P5/P7 findings above.

## Summary

The plan fixes what the review found and does not fix a non-bug (the `check-loop.mjs:48` citation is the product
twin's; the dev loop's equivalent is `.dev/floor/check-ship.mjs`, same property). The two P0 findings are about how
the new checker's guarantee is worded — it proves a green record is present and agrees with a committed report, never
that the chain ran, and it runs the PR's own copy of itself. The P5 finding is a fact the build must read from the
runner before pinning the loop condition. The rest are small.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 7 advisory: 4 important, 3 minor) — for the human to weigh
before /pharn-dev-build. Step 1b (FLOOR) is reported in the header and is not counted here.
