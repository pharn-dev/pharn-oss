# GRILL — loop-interactive-cli-prep

Plan: `.dev/features/loop-interactive-cli-prep/PLAN.md` · spec-hash: recomputed `d5a97430…` = the plan's pin (no
drift) · **Step 1b lessons declaration: GREEN** — `check-plan-lessons.mjs` exit 0 (L19, L40, L42, L64, L66 resolve and
are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings (advisory — every one gates nothing)

### error-handling

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-interactive-cli-prep/PLAN.md:87"
  problem: "The plan handles a gate that is SLOW (over 540 s) but says nothing about a gate that is RED, which stops the run at S14 just the same."
  evidence: "a `pharn.config.json` `gates.exclude` commit only if a gate exceeds 540 s"
```

### performance

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-interactive-cli-prep/PLAN.md:106"
  problem: "A gate timed once, standalone, just under 540 s can still be killed in the run, where the same gates share the machine with the spec, plan and grill agents; the plan names the effect but no margin."
  evidence: "measured once ... under no concurrent model load; a loop runs the same gates while spec, plan and grill work, so in-run times may be longer"
```

### security

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/loop-interactive-cli-prep/PLAN.md:5"
  problem: "START.md tells the human to start an unattended run in auto permission mode with `--accept-host-execution`, which waives 7.1.0's isolation stop on a host holding their credentials; the plan does not say what the flag accepts."
  evidence: "Prepare attempt 1 of an interactive `/pharn-loop --quick` measurement ... in `~/Projects/pharn-starter-6.72`"
```

### observability (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/loop-interactive-cli-prep/PLAN.md:21"
  problem: "`claude --version` at collection time answers for the CLI installed THEN, not the one that ran; Claude Code can update between preparation and the run, so the table's Claude Code column needs the transcript's own `version` field."
  evidence: "The run protocol tells the collecting session to read attempt 1's schema from attempt 1's own transcript the same way."
```

## Axes with no finding

- testability — presence recognized: `## Guarantee audit` names a byte comparison for `START.md`, a prettier check, and
  line-cited values for §0. Adequacy note (prose, not a finding): §0's values come from one extraction script; the
  review should re-read each cited line by a second method (`sed -n '<n>p'`).
- architecture / coupling — fit recognized: one apparatus file under `.dev/measurements/`, the established place for
  such records; no shared mutable state between modules.
- comprehension — the thresholds carry their source (540 s = the per-gate timeout PHARN passes); the four decisions
  each state their reason.
- documentation, a11y, i18n, migrations, privacy — no public surface, UI, user-facing text, persisted schema or
  personal data is added.

## Summary

The plan prepares a run it does not perform, so its gaps are about the run's preconditions: a red gate and a
near-threshold gate are both S14/S14b stops the request's rule does not cover, the host-execution flag deserves one
sentence of what it waives, and the CLI version must be read from the run's own transcript (L42's NOW-vs-THEN in a
second place).

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory) — for the human to weigh before /pharn-dev-build.
