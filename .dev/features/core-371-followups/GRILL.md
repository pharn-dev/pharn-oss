# GRILL — core-371-followups

Plan: `.dev/features/core-371-followups/PLAN.md`. Spec hash: recomputed
`8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167`, which equals the plan's `spec_content_hash` (no
drift). Step 1b lessons declaration (FLOOR, `check-plan-lessons.mjs`): **GREEN**, exit 0. Quoted verbatim:

> GREEN — applied_lessons: L50, L64, L68, L75, L78 (.dev/features/core-371-followups/PLAN.md); all 5 cited id(s)
> resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons
> were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line
> reading "L50: considered." satisfies the reference check.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory, grouped by axis)

### Comprehension / honest scope (inline P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/core-371-followups/PLAN.md:104"
  problem: "Correction 1 keeps the section's closing rule about running inside an orchestrator, which no longer happens once the new first sentence says no orchestrator invokes the form; a reader may find the two sentences at odds."
  evidence: "The rest of the section is unchanged."
```

The brief asks for the section's rules to be kept, and the sentence is still a correct rule if an orchestrator ever
calls the form again. That makes this a question for the human, not a defect. Build should check that the reworded
first sentence does not contradict the closing one. It does not: the closing sentence is conditional ("Run inside an
orchestrator").

### Testability (griller 13, P1)

Presence recognized: `## Evals to write (P1)` declares none and says why, and the plan names its checks: the
re-pointed `command-hygiene` presence pin, `npm test`, `docs:check`, and L64's grep-and-probe of the CHANGELOG
restatements. Layer 2 (adequacy, advisory) produced one concern:

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/core-371-followups/PLAN.md:149"
  problem: "Only S1 gains a pin. The S2–S5 corrections (comments and prose) have no deterministic check that they stay true, so a future change to ROUTE_POLICY, to CONTROL_SURFACE or to pharn-cli's install surface can make them stale again unseen."
  evidence: "None: no capability, rule or checker behaviour changes. The one test edit re-points a presence pin at the corrected sentence."
```

This is consistent with P7. No real failure justifies a new checker over prose, and the plan does not claim one.
Recorded for the human.

### Guarantee audit (inline P0)

Every claim is labeled. The settings comment and the hook header are prose about a FLOOR hook and claim nothing new.
The pharn-cli claim is labeled advisory and is corroborated by `pharn-install.json` (byte-equality under
`docs:check`). No finding.

### Trust (inline P2)

The only foreign input is pharn-cli's CHANGELOG, read as data and corroborated in-repo. No finding.

### P3, P5, and the other grillers

- P3: each file still changes for one reason, and no sibling references are added.
- P5: no new branch.
- The architecture, coupling, documentation, error-handling, performance, security, privacy, i18n, a11y, migrations
  and observability grillers apply to comment and prose corrections with no new surface, behaviour, schema, UI or
  data flow. Each judged that no finding was warranted. Documentation's "needs it" test is not met: no public
  surface is added.

## Summary

This is a small, well-scoped correction increment. Every stale claim was re-verified live with cited evidence. The
L50/L75 sweep found three apparatus restatements, and the plan handles them. One was dropped at GATE 1 to avoid a
conflict with PR #494, and the plan records that. The human-only edits are sequenced before the anchor (L68). The two
concerns above are minor and advisory.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory) — for the human to weigh before /pharn-dev-build.
