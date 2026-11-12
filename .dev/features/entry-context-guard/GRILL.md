# GRILL — entry-context-guard

Plan: `.dev/features/entry-context-guard/PLAN.md` · spec-hash: `d19c3ae5…a8bcf` recomputed with `hash-doc.mjs`, equal to
the pin (no drift) · **Step 1b lessons declaration: GREEN** (`check-plan-lessons.mjs` exit 0 — L15, L35, L41, L62, L68,
L81, L84 resolve and are referenced in the body; the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings (advisory — each gates nothing; free text is quoted DATA from the plan)

### Inline axes

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/entry-context-guard/PLAN.md:123"
  problem: "The 'latest request' is ranked by first-line timestamp with a tie rule, but the plan does not say what happens to a request whose timestamp does not parse; within one context the transcript is one append-only file, so walk order already is append order and needs no timestamp at all."
  evidence: "the latest by first-line timestamp (`tsMs`; a tie keeps the later in walk order)"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/entry-context-guard/PLAN.md:111"
  problem: "The binding needs the run-start line's tool result on disk before the check runs; the plan's probe shows it is there by the NEXT Bash call, but nothing in the planned command text forbids issuing the run-start line and the check in one parallel tool batch, where the result would not yet exist and the check would read `no-holder` (go on) on every run."
  evidence: "immediately after `mark-phase.mjs --kind run-start`, so the run-start marker exists for this session and its printed line is in the calling context's tool result"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/entry-context-guard/PLAN.md:74"
  problem: "A `-core.mjs` module in this floor is usually pure; this one reads the filesystem through `transcript-core.mjs`, and the plan does not say so in the module's own description."
  evidence: "Imports `transcript-core.mjs` (its third consumer)"
```

### architecture (P3)

Fit recognized: the binding is composed from the existing owners (`runWindow`, `bindingMarkers`, `markerLine`,
`sessionScan`, `bindRun`) and the stop reuses the S15 entry-stop shape (no record, close part's Step 7, Final step).
The core's I/O is the minor finding above.

### coupling (P3)

One hidden ordering, raised above as the P6 finding (the run-start result must be on disk before the check). The
witness file is written by the shell redirect and read only by Step 7, the same seam as `isolation.json`. No other
entanglement.

### comprehension (P7)

Rationale recognized for the non-obvious values: 320,000 (the 36-run partition and margins), the [1, 1,000,000] bound
(no current window is larger), S15b (keeps the S1–S18 cites true). No finding.

### documentation (P7)

The public surface is one CLI, one config key and one stop row; the plan declares the floor-gates guide section, the
CHANGELOG entry and the command text. No finding. Note: the config key is documented nowhere a user reads except the
S15b row and the CHANGELOG; that matches `budget.instructionGrowthBytes`'s precedent.

### error-handling (P7)

Present and adequate: a closed `unknown` reason set, a top-level catch (`unknown crashed`, exit 0), and the loop
going on for every exit but `3` — which also covers node's exit 1 on a module that cannot load. No finding.

### performance (P7)

No scaling risk: one `sessionScan` pass per run (the ledger already makes the same pass at every stop). Measured
this grill: a scan of this session (a 1.9 MB main file, 6.2 MB of subagent files) took 0.09 s. No finding.

### security (P2)

Scanner clean. The transcript and config are untrusted inputs and the plan's trust audit states what is read and how a
refused value is quoted; a forged transcript can only trip the stop or leave it off. The new grant carries a `*` after
`--feature` and in the redirect path, the same shape as the isolation line's grant. No finding.

### testability (P1)

Presence recognized: seven criteria, each mapped to a named test or pin, with non-vacuity controls (the swapped
fixture, the mutation control). No finding.

### a11y, i18n, migrations, observability, privacy

Not applicable: no UI, no user-facing locale text, no schema, no runtime service to observe, no personal data (the
printed line carries no session or agent id). No finding.

## Summary

The plan is grounded in a measured trigger and a probe, and composes the existing binding rather than re-spelling it.
Two concerns are worth fixing before the build: rank the bound context's requests by walk order (append order) rather
than by timestamp, and make the command text say the check is its own Bash call issued after the run-start line's
result is back (never in one parallel batch with it), or the guard silently reads `no-holder` on every run. The third
is a one-line honesty fix in the core's header.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 2 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
