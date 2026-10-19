# GRILL — regress-install-config

Plan: `.dev/features/regress-install-config/PLAN.md` · spec-hash: MATCH (`2c84959c…b12e` recomputed with
`.dev/floor/hash-doc.mjs`) · **Step 1b lessons-declaration verdict (FLOOR): GREEN** —
`check-plan-lessons.mjs` exit 0, `[L15, L35, L36, L41, L54, L59, L62, L65]` all resolve and are referenced in the body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — gate nothing)

### error-handling

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/regress-install-config/PLAN.md:102"
  problem: "The plan says the install phase creates the link but not what happens when symlinkSync itself fails (EPERM, EEXIST from a tracked base node_modules, a dangling leftover on resume)."
  evidence: "`pharn/floor/stage-regress.mjs` — head-init reads the declaration and checks the `node_modules` precondition; the install phase creates the link"
```

### security (Layer 2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/regress-install-config/PLAN.md:34"
  problem: "The link target is an absolute, machine-local path; REGRESSION.md and the report are committed by /pharn-loop, so the disclosure must be fixed text that never names the target or the base worktree path."
  evidence: "the stage creates `<base worktree>/node_modules` as a symlink to the project's own `node_modules`"
```

### architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/regress-install-config/PLAN.md:46"
  problem: "The report's additive blocks have a pinned order (entry_gate_changes is documented as last) and a test asserts report-minus-blocks equals the checker's stdout; the plan does not say where base_install sits or that the test strips it."
  evidence: "`regression-report.json` gains an additive `base_install` block only when a declaration was used"
```

### determinism (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/regress-install-config/PLAN.md:102"
  problem: "The node_modules precondition is checked at head-init, but the link is made at the install phase, possibly in a later --resume invocation; the plan should re-check at the point of use."
  evidence: "head-init reads the declaration and checks the `node_modules` precondition"
```

### testability (P1)

No absence finding — presence recognized: `## Files` names a test per changed module, including the LOOP-11
condition itself (library + `none` refused) and its fix (library + `head-node-modules` done, target survives cleanup).

### Other grillers

a11y, i18n, privacy, migrations, observability, performance: not applicable (floor code with no UI, user text, PII,
schema or runtime service); no finding manufactured. coupling, comprehension, documentation: the new module has one
axis of change (how a project declares the base install), the README and contract are planned; fit recognized.

## Summary

The plan is narrow and its new branches are membership tests. The concerns are around the one non-trivial addition,
`head-node-modules`: failure handling of the link itself, keeping machine-local paths out of committed renders, the
report block's position, and re-checking the precondition at the point of use. The added value re-admits, opt-in, a
borrowing the default removed; the plan argues why that costs attribution rather than the loop's green, which is the
right axis to argue it on.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 2 important, 2 minor) — for the human to weigh
before /pharn-dev-build. The Step 1b lessons verdict (GREEN) is a separate floor verdict and is not counted here.
