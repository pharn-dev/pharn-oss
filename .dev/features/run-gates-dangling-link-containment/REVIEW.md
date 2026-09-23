# REVIEW — run-gates-dangling-link-containment

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Everything
below is advisory. The increment was reviewed as `trust: untrusted`, and nothing in it read as an
instruction.

## Floor-gate findings

None.

- **L-floor → P0.** The new behaviour ("a dangling link, a file component or a dangling state root is
  refused as a closed `path-containment` document") is a filesystem/enum check in tested code, and the
  new test iterates each member. The two things it does not cover are stated in `VERIFY.md` and the
  CHANGELOG:
  - the TOCTOU window between the check and `mkdirSync`;
  - the unreached EACCES branch.

  The comment at `run-gates.mjs:159` says why a non-ENOENT error is refused: the walk cannot prove the
  path safe, not that it proved an escape (GRILL finding 1, applied).

- **L-eval → P1.** No Capability was touched. The L4 red was measured on all three cases before the fix
  (`VERIFY.md`), and the test header names which assertions carry it (GRILL finding 2, applied).
- **L-trust → P2.** No new input, and `--out` is still only a path.
- **L-axis → P3.** Both files change on one axis: containment in the runner.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/run-gates-dangling-link-containment/PLAN.md:112"
  problem: "The plan's guarantee audit lists ELOOP as an lstat error that takes the refusal branch. ELOOP is unreachable there: the walk lstats one component at a time and refuses at the first symlink, so no lookup ever passes THROUGH a link. The build dropped ELOOP from the code comment for that reason. The plan's word stayed."
  evidence: "Other `lstat` errors (EACCES, ELOOP) take the same branch, but no test reaches them."
```

This is left as is. The plan is a record of intent, and the shipped comment is the accurate one.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/run-gates.mjs:174"
  problem: "The EACCES branch (`cannot lstat …`) is reached by no test. The branch existed before this fix and was untested then too, so it is stated as a residual rather than a gap this increment opened."
  evidence: 'fail("path-containment", `cannot lstat ${cur}: ${e.message}`);'
```

## Verdict

**GREEN — 0 floor-gate findings, 2 advisory (minor).**

No lesson candidate. This increment is L54's prescribed remedy applied to its instance (1), with nothing
new failing.
