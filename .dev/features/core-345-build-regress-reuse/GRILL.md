# GRILL — core-345-build-regress-reuse

Plan: `.dev/features/core-345-build-regress-reuse/PLAN.md` · spec-hash: match
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN**
(`check-plan-lessons.mjs` exit 0 — applied_lessons: L43, resolves, referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory)

### Inline — guarantee audit / evidence (P0, P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/core-345-build-regress-reuse/PLAN.md:13"
  problem: "The plan attributes the fingerprint difference to BUILD.md, but the fingerprint was not recomputed; the transcript shows BUILD.md is the only Write-tool write in the window, not that no other tool wrote a fingerprinted path."
  evidence: "the run2 transcript shows WHICH write made them disagree (BUILD.md, ...)"
```

Remedy for the build: word it as "the one fingerprinted write the transcript shows in that window", and keep the
decision resting on what IS measured — the two recorded `fp_before` values and identities differ — which holds
whatever the writer was. The structural reason (Step 5 writes BUILD.md after Step 4 on every build) stays advisory.

### architecture griller (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/core-345-build-regress-reuse/PLAN.md:71"
  problem: "gate-reuse-core.mjs owns 'which two executions are equivalent'; 'which source is offered' is head-reuse-offer.mjs's axis, so the note must be phrased as an equivalence fact (identity/fingerprint), not as an offer policy."
  evidence: 'header comment only: a "NOT A SOURCE — the build''s full gate run (CORE-345)"'
```

Fit otherwise recognized: no code, no new mechanism; the contract bullet sits in the section that states CORE-89's
bounds, which is where the ticket asks for it.

### comprehension griller (P7)

No finding: the WHY (identity binds `fp_before`; BUILD.md is an INCLUDED artifact written after the gate) and a reopen
condition are both stated.

### documentation griller (P7)

No finding: no public surface is added; the change IS documentation of a decision.

### testability griller (P1)

Presence recognized: no behaviour changes, so the verification is the existing suite + `validate` + `docs:check` +
`check:surface-bump` staying green. Adequate for a comment/contract-prose change.

### Other grillers (a11y, coupling, error-handling, i18n, migrations, observability, performance, privacy, security)

No finding: the plan changes prose only — no UI, no new coupling, no runtime path, no schema, no data handling.

## Summary

The decision is grounded in committed stamps (identities and fingerprints differ) plus the raw transcript's call order.
The one real concern is wording: the evidence shows BUILD.md as the only Write in the window, not proof it is the only
change; the decision should rest on the measured mismatch. Also keep the gate-reuse-core note on its own axis.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory: 1 important, 1 minor) — for the human (here the
orchestrator, under delegation) to weigh before /pharn-dev-build.
