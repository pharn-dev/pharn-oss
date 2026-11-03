# GRILL — reconcile-window

Plan: `.dev/features/reconcile-window/PLAN.md`. Spec-hash check: `pharn/ARCHITECTURE.md` recomputes to
`d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`, equal to the plan's `spec_content_hash` (no
drift). Step 1b lessons-declaration verdict (FLOOR, `pharn/floor/check-plan-lessons.mjs`): **GREEN** — "all 11 cited
id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body".

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — grouped by axis)

### coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/reconcile-window/PLAN.md:28"
  problem: "The anchor becomes a fourth reader of the run-marker path layout (hook scanRuns, the setter's loop scan, the reconcile probe), restated by hand, so a marker relocation would have to find it."
  evidence: "`pharn/.run/pharn-loop/<A>/active.json` or `pharn/.run/pharn-ship/<A>/active.json` is present"
```

Recommendation: build the marker path with `run-marker.mjs` `markerPath(root, dir, name)` (the reconcile checker
already imports `run-marker.mjs`), so the layout has one owner in the product floor.

### security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/reconcile-window/PLAN.md:30"
  problem: "The refusal names closing the other run's marker as a remedy, and `/pharn-loop` pre-approves `require-loop-record.cjs --close *`, so a model inside a second loop can close the first loop's marker and re-anchor without a prompt; the guarantee audit does not state this bound."
  evidence: "names the human remedy (finish or close that run, or use a worktree)"
```

Recommendation: state the bound in the guarantee audit, the contract and the CHANGELOG entry (markers are
model-reachable through the loop's own grant; the refusal makes the erase loud for tooling, not for an actor), and
phrase the message so the close is a human's action.

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/reconcile-window/PLAN.md:29"
  problem: "The plan states ENOENT-style absence and age, but not what a marker `lstat` that fails with another error (EACCES, ELOOP on a parent) or an unreadable state directory decides."
  evidence: "(`lstat`, never followed) with an mtime within 24 h either way"
```

Recommendation: mirror the hook's `scanRuns()` rule (only ENOENT/ENOTDIR mean "no run"; any other error counts as
open, fail-closed) and pin it with a test.

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/reconcile-window/PLAN.md:29"
  problem: "The 24 h ceiling carries no stated origin; a maintainer cannot tell whether it is a new choice or the hooks' RUN_AGE_CEILING_MS."
  evidence: "with an mtime within 24 h either way"
```

Recommendation: cite the hook ceiling (`enforce-writes-scope.cjs` / `set-writes-scope.cjs` `RUN_AGE_CEILING_MS`,
symmetric) in the code comment and the contract.

### architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/reconcile-window/PLAN.md:74"
  problem: "Moving PIPELINE_RE into reconcile-baseline.mjs gives the anchor module a pipeline-artifact regex whose other use (isPipelineArtifact) is the checker's exemption rule; the move is justified by L35 but the module header should say why it owns it."
  evidence: "`PIPELINE_RE` + `activeFeatureSlug` moved here"
```

### migrations (P7) — Layer 2

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/reconcile-window/PLAN.md:1"
  problem: "The plan does not say how a baseline anchored before 7.3.0 (a legacy record, a null scope_snapshot) is read by the new refusal; the record shape is unchanged, but the reading of old records is a persisted-data question."
  evidence: "the baseline record keeps its shape (no new field, `version` stays 1)"
```

Recommendation: state that a legacy null snapshot derives no feature and never refuses, and test it.

### workflows prefix (P7, error-handling/scope)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/reconcile-window/PLAN.md:52"
  problem: "`apply-plan-deletions.mjs`'s control-path refusal has no operator opt-in, so after this change a plan cannot delete a workflow file even where the operator opted the plan into `.github/workflows/**` with --allow-exec-config; the plan names the refusal but not that it is unconditional."
  evidence: "`apply-plan-deletions.mjs` refuses a plan's `(delete)` of a workflow file (`control-path`)"
```

Recommendation: state it as a cost (a workflow deletion is done by a human, like a floor deletion) in the CHANGELOG
entry and the contract.

## Griller notes (no finding)

- testability (P1): presence recognized — "Evals / tests to write" lists cases for every behaviour change, with
  falsifiers. Adequacy: add the lstat-error case (above) and a legacy-record case.
- documentation (P7): declaration recognized — contract, guide, CLAUDE.md, docs/limitations.md, CHANGELOG, LIMITS by
  proposal.
- observability (P6): no production runtime; the refusal message is the signal. No concern warranted.
- performance (P7): one JSON parse of the prior baseline and at most a few `lstat`s / two `readdir`s per anchor. No
  scaling risk recognized.
- privacy (P2), i18n (P7), a11y (P7): scanner clean; no user-facing UI or personal data. No concern warranted.
- architecture: otherwise fit recognized (reuses `FEATURE_SLUG_RE`, `ITERATED_STAGES`, the always-reconciled data
  file and its loader).

## Inline interrogation

- P0: the refusal is labeled as floor-in-the-CLI, advisory-in-invocation, and bounded (marker presence only). The
  workflows prefix reuses an existing floor mechanism. The writes-scope "won't fix" is argued from the #408
  failure and pinned by a test rather than asserted.
- P7: the anchor refusal's trigger is the audit's measured probe (two loops in one tree, the second anchor erasing the
  first's window), not a dogfood run; the plan should say so where it claims the trigger. The workflows prefix is the
  review's BLOCKER fix (3). The cost-ledger narrowing answers a recorded loosening.
- P5: every branch is a membership/regex/lstat/integer test; the terminal remedy is a human action.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 3 important, 4 minor) — for the human to weigh before
/pharn-dev-build.
