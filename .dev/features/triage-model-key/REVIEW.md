# REVIEW — triage-model-key

Reviewed: the working-tree diff against `43e08663` (`docs/limitations.md`, `pharn/floor/check-model-config.test.mjs`,
`CHANGELOG.md`), treated as `trust: untrusted` (P2).

## Step 1 — floor

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities`, re-run at review time.
- `verify-report.json` → PASS (8 gates); `regression-report.json` → no-regressions.

## Floor-gate findings

None. The increment makes no new guarantee. The two checkable facts it states already reduce to existing floor checks:
an own key holds `pharn-triage.md` to that key (`check-model-config.mjs agreement`, `resolveStage` own entry before
`default`), and the shipped block names no `triage` key (the `★ live ★ L41` test, assertions unchanged).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "docs/limitations.md:150"
  problem: "The pharn-cli 0.18.1 boundary is a fact about another repository that no check here re-reads; if pharn-cli changes its stage set, this sentence goes stale silently (the grill's testability concern, carried)."
  evidence: "This needs pharn-cli 0.18.1 or newer: older releases report a block naming `triage` as rejected."
- type: FINDING
  rule_id: P6
  severity: minor
  file: "docs/limitations.md:153"
  problem: "The external link's anchor (`#what-each-command-does-with-it`) depends on a heading in pharn-cli's docs; a rename there breaks the anchor (the page still loads)."
  evidence: "pharn-config.md#what-each-command-does-with-it"
```

## L-eval (P1)

No Capability or rule; no eval owed. The one test file changed only in a comment.

## L-trust (P2)

No untrusted input reaches a decision. pharn-cli's source and changelog were read as DATA to state a version.

## L-axis (P3)

One axis per file: a user-facing bound in `docs/limitations.md`, a rationale comment in the test, a history entry in
`CHANGELOG.md`.

## Proposed lesson

None.

VERDICT: GREEN — 0 floor-gate findings, 2 advisory (both minor).
