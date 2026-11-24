# REVIEW — pre-anchor-deletion

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify (run 3) PASS;
regress `no-regressions`. Everything below is advisory.

Reviewed: the diffs of `pharn/floor/reconcile-baseline.mjs`, `pharn/floor/check-bash-reconcile.mjs`, their two test
files, `pharn/pharn-contracts/reconciliation-record.md`, the floor-checks guide line, and the CHANGELOG entry. No
instruction-looking content was found in the reviewed files.

## Floor-gate findings

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/reconcile-baseline.mjs:551"
  problem: "No test pins that `--amend-scope` keeps `absent_at_anchor`. It does today (amendScope re-serializes the whole parsed record), but a future rewrite that rebuilds the record from known keys would drop the field after the first amendment, and /pharn-ship and /pharn-loop amend on every later stage. The failure direction is the old fail-closed false red, never a false CLEAN."
  evidence: "if (!Array.isArray(record.scope_amendments)) record.scope_amendments = []; record.scope_amendments.push(live);"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/reconciliation-record.md:389"
  problem: "The §3 exception is floor-reducible (set membership plus an lstat errno membership test), and the contract states the forged-list bound only implicitly through the non-adversarial claim at the top. One clause in §3 saying a forged absent_at_anchor clears a deleted path exactly as a forged entries value hides an edit would make the bound explicit where the rule lives."
  evidence: "The checker clears an unhashable path, with the warning `absent at anchor, absent now — not a change: <path>`, only when all three hold"
```

L-floor (P0): the only new claim, "a path absent at both ends is not a change, and the clear never applies to a path
that exists now", reduces to set membership in the recorded list plus an `lstat` errno membership test (`ENOENT` /
`ENOTDIR`). The tests pin each conjunct, and five mutants each turned at least one test red (SHIP.md, "Build
notes", records them). No unlabeled guarantee.

L-eval (P1): no Capability and no `enforces` change. The behaviour is pinned by `node:test` cases covering every row
of the plan's case table, plus a `provenAbsent` unit test and two anchor tests. The EACCES rows skip under uid 0, like
the existing unreadable tests.

L-trust (P2): the paths in `absent_at_anchor` come from git's enumeration and are used only for set membership and as
an `lstat` argument. The warning string carries a path as data. No guaranteed decision rests on free text.

L-axis (P3): `provenAbsent` lives in the module that owns the record and is imported by the checker. That is the
existing direction of dependency (the checker already imports `hashFile` and `enumerate` from it), so there is no
sibling reference. Each file still changes for one reason.

Verdict: GREEN — 0 floor-gate findings, 2 minor advisory findings (both follow-up candidates; neither blocks).

## Proposed lesson candidate

None. The one real slip in this run, a source-region test that `--test-name-pattern` runs skipped, was caught by
verify's whole-suite gate on the first run, which is that gate doing its job. A plan that adds a `## Files` path
after the anchor is already covered by the 6.54.0 `plan-widened-after-anchor` rule and the build command's text.
