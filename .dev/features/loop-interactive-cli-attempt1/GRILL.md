# GRILL — loop-interactive-cli-attempt1

Plan: `.dev/features/loop-interactive-cli-attempt1/PLAN.md` · spec-hash: recomputed `d5a97430…` = the plan's pin (no
drift) · **Step 1b lessons declaration: GREEN** — `check-plan-lessons.mjs` exit 0 (L19, L32, L40, L42, L64, L66
resolve and are referenced in the body).

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
  file: ".dev/features/loop-interactive-cli-attempt1/PLAN.md:76"
  problem: "The plan checks the install by bytes but does not say what happens when a compared file differs, so a mismatch has no declared outcome."
  evidence: "Install `--ref main`, checked by bytes. This branch changes no product byte, and `main` is `e4b17048`"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-interactive-cli-attempt1/PLAN.md:78"
  problem: "The narrowed test script is fitted to attempt 1's AC paths; the plan names the risk that attempt 2 maps a test outside the filter but not which stop it would produce or how the protocol tells the collector."
  evidence: "a test file outside the filter would not be collected, and the protocol says where that would show."
```

### security

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/loop-interactive-cli-attempt1/PLAN.md:66"
  problem: "The requested allow rules use a trailing wildcard, so they pre-approve every argument form of the setter and of reconcile-baseline (the setter's opt-in flags, a fresh --anchor), not only the pinned close-out lines; the plan does not say that this removes the classifier's review of those forms for attempt 2."
  evidence: "add ... allow rules for `Bash(node .claude/hooks/set-writes-scope.cjs *)` and `Bash(node pharn/floor/reconcile-baseline.mjs *)` (the request, carried into the plan's outside-repository list)"
```

### testability

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-interactive-cli-attempt1/PLAN.md:102"
  problem: "No eval is owed, but the plan does not name how §1's line cites will be re-checked beyond the whole-repo gates, which do not read cites."
  evidence: "None: no capability or `rule_id` is added."
```

### comprehension

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-interactive-cli-attempt1/PLAN.md:81"
  problem: "'Attempt 3 is not expected' rests on an unstated assumption: that attempt 2's orchestrator again skips 7.1.1's --no-foreground-agent rule; one that follows it runs the stages inline, makes no Agent call, and triggers attempt 3."
  evidence: "Attempt 3 is not expected, because both of attempt 1's calls went background on the same CLI and schema"
```

No finding from a11y, i18n (no user-facing surface), migrations (no persisted data shape), observability (no
production runtime), performance, privacy (scanner clean; the copied transcripts stay local), architecture or
coupling (one apparatus file plus repo-meta, no module edge), or documentation (the CHANGELOG entry is the
user-facing record).

## Summary

The plan's diagnosis is grounded in cited transcript lines. The concerns are about attempt 2's preparation:

- what a byte mismatch does to the install;
- the test filter's fit to a plan attempt 2 has not written yet;
- the breadth of the two wildcard allow rules;
- the attempt-3 expectation, which silently assumes the orchestrator skips a rule again.

Plus how §1's cites get a second read.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: 4 important, 1 minor) — for the human to weigh
before /pharn-dev-build.
