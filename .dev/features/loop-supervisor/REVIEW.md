# REVIEW — loop-supervisor (7.9.0)

Reviewed: the working-tree diff of `feat/loop-supervisor` against `eae5fce8` (34 planned paths), treated as
`trust: untrusted` (P2).

## Step 1 — floor

- `node pharn/floor/validate.mjs .` → GREEN, re-run at review time.
- `verify-report.json` → PASS (8 gates); `regression-report.json` → no-regressions.

## Floor-gate findings

None. Each guarantee reduces to a floor primitive or is labelled advisory:

- the decision's shape, coverage and binding: `supervisor-core.mjs`, enum/regex plus the triage digest;
- the escalation precondition: worded as agreement with the run's own triage and archive count (L43);
- the commit's KNOWN RISK paragraph: tested `loop-closeout.mjs` over the checked file, ids only;
- the report section: a tested renderer, with the free text fenced;
- the one-file write scope of `/pharn-supervise`: the fix #7 hook.

The decision itself is stated advisory in the command, the contract, the close part's claims and `LIMITS.md §1d`.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/loop-closeout.mjs:334"
  problem: "The closeout re-checks SUPERVISOR.json at commit time, but nothing re-checks it between the Step 4 read and the build; a decision file edited mid-run (to a different valid decision) is caught only at the close, after the build ran."
  evidence: "export function knownRisk(feature) {"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".claude/commands/pharn-loop-close.md:89"
  problem: "The record's `## Known risk` section is advisory and unchecked: a model that omits it leaves the record silent while the commit and the run report still carry the ids — stated, but a reader of LOOP.md alone would miss them."
  evidence: "`check-loop-record.mjs` ignores extra sections"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "docs/limitations.md:155"
  problem: "pharn-cli does not know the `supervise` stage, so `pharn status` will not list it until a port; named as a follow-up, not built here."
  evidence: "No pharn-cli release accepts a `supervise` key yet, so do not add one."
```

## L-eval (P1)

No Capability. The new checker has 16 tests over a realistic ten-finding round; the closeout gains 3 tests (the
paragraph, both refusals, argv hostility) and the renderer 2 (proceed-at-risk listing with fence lengths; four other
states). Hygiene pins cover the command budget, `writes:`, the front order with the supervisor lines, the S16/S17
branch and the grant closure.

## L-trust (P2)

Untrusted text reaches no decision: the checker reads ids and enums; the commit gets ids, a count and the slug; the
report fences `problem`, `evidence` and the supervisor's `reason` with `quoteData`. Test fixtures carry injection-shaped
text and assert it never reaches output or argv.

## L-axis (P3)

One axis per file: the contract (schema), the core (pure rules), the CLI (I/O), the command (stage procedure).
`loop-closeout.mjs` and `render-run-report.mjs` import `supervisor.mjs`'s `readSupervision` — a floor sibling in the
same layer, as they already import other floor CLIs' cores; no capability-module crossing.

## Proposed lesson

None.

VERDICT: GREEN — 0 floor-gate findings, 3 advisory (all minor).
