# GRILL — loop-marker-integrity

Plan: `.dev/features/loop-marker-integrity/PLAN.md` · spec-hash check: `d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`
recomputed with `.dev/floor/hash-doc.mjs` — **equal** to the plan's pin · Step 1b lessons declaration (FLOOR,
`pharn/floor/check-plan-lessons.mjs`): **GREEN** — `applied_lessons: L14, L15, L26, L27, L29, L35, L36, L43, L52, L62,
L68, L81`; all 12 cited id(s) resolve and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 133 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### Inline axes

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-marker-integrity/PLAN.md:119"
  problem: "D3's gain depends on the session's permission mode: in auto mode, which the README recommends for unattended runs, the ungranted flagged line may still run without asking the person, so the decision moves from the model's grant to Claude Code's classifier, not to the operator."
  evidence: "With the grant gone, Claude Code's permission system — not the model — decides whether the line runs without asking (default mode asks; auto mode or a person's allow rule may not: ADVISORY, the person's setting)."
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-marker-integrity/PLAN.md:73"
  problem: "Finding 5's `fs.linkSync` publish needs hard-link support; on a filesystem without it (some network or removable volumes) every `--open` would fail and every run would stop at S9, a new failure mode the plan does not weigh against the exclusivity it buys."
  evidence: "write `active.json.tmp-<pid>`, then `fs.linkSync` it to `active.json` (atomic and exclusive: EEXIST is the D1 refusal, so a concurrent second open cannot overwrite either)"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-marker-integrity/PLAN.md:114"
  problem: "The plan does not say what a marker written by the pre-7.3.0 hook (no `mode` key) means for a quick run in flight across an upgrade: it reads as full, so that run's record REDs MODE_UNWITNESSED and is not committed."
  evidence: "the flag stays optional at the hook (absent → no key → read as `full`)"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-marker-integrity/PLAN.md:124"
  problem: "Adding BLOCKED_IDS to loop-record-core.mjs changes that module's stated single purpose ('the ONE implementation of the loop-record's ## Handoff grammar'); the plan argues one axis (the loop-record contract) but does not list the header rewording that would make the file's own description true."
  evidence: "D4 — `BLOCKED_IDS` lives in `loop-record-core.mjs` (the loop-record contract's shared reader, already imported by `check-loop-record.mjs`; one axis — it changes when the loop-record contract changes, P3)"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-marker-integrity/PLAN.md:162"
  problem: "Re-running build Step 0's `--anchor` after the human patch starts a new epoch, so the build's own Write-tool writes made before it are outside every reconcile window; the plan names the L68 ordering but not this consequence."
  evidence: 'commit "loop-marker-integrity: maintainer-applied human patch" → re-run build Step 0 (setter, then `--anchor`) → regress / verify / review'
```

### Grillers

- **testability** — presence recognized: `## Evals to write (P1)` names a test per behaviour and the plan says no
  Capability is touched, so no `evals/` case is owed. No finding.
- **architecture** — fit recognized: shared vocabulary routed through an existing core both consumers already import
  (`loop-record-core.mjs`, `loop-mode-core.mjs`), the floor still shells `check-loop.mjs` and never imports a hook; the
  restated marker schema stays pinned by the existing ✧ L35 test. The header wording is the P3 minor above.
- **coupling** — the marker becomes a second channel between Step 1a and the decision check (an ordering: the marker
  must be written before the record is checked). That ordering already exists for `cap` (6.65.0) and is declared in
  the contract; no new hidden ordering. No finding.
- **error-handling** — declared for the hook (every write failure exit 2, tmp removed) and the checkers (fail-closed
  REDs). The filesystem-support gap is the P7 finding above.
- **security** — scanner clean. Layer 2: the change narrows two model-reachable routes (marker re-open, the
  pre-approved override) and closes a skip-on-any-value; the residual (`--close` + `--open` + re-capture) is stated as a
  bound. No further finding.
- **comprehension** — D1–D4 each carry a why and a rejected alternative. No finding.
- **documentation** — the new hook grammar and refusal are documented in the hook header, the contract, the dev guide
  and README; the trusted-doc wording goes to `DOCS-PROPOSAL.md`. No finding.
- **observability** — the scanner's `logging` hit (line 133) is incidental (the `GRILL.md` "grill log" `## Files`
  entry). The change is
  a set of CLIs whose observable output is their exit code and RED line; nothing operational is added. No finding.
- **performance** — D1 explicitly declines a git spawn in the decision check; the added work is one `lstat` and one
  set lookup. No finding.
- **a11y**, **i18n**, **privacy**, **migrations** — the change touches no UI, user-facing strings, personal data or
  persisted schema. No finding.

## Summary

The plan's direction is sound and each finding has a stated fix. Two concerns are worth acting on before the
build: (1) the D3 trade should be stated as mode-dependent at GATE 1, not only as ADVISORY in the plan body, because
under auto mode the change mainly removes the model's own pre-approval rather than adding the operator's; (2) the
`linkSync` publish trades a portability failure (every `--open` failing on a volume without hard links) for an
exclusivity property that only a concurrent second `--open` of the same name would exercise, which no run issues — a
`lstat` refusal followed by `renameSync` (the counter's own `persist()` form) keeps the atomic publish without the
dependency. The three minors are wording the build should carry (upgrade-in-flight bound, the core's header, the
re-anchor consequence).

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict above is a separate floor verdict and is not counted here.
