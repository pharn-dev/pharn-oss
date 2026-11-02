# GRILL — reconcile-state-root

Plan: `.dev/features/reconcile-state-root/PLAN.md`. Spec-hash check: recomputed
`d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`, equal to the plan's pin (no drift). **Step 1b
lessons-declaration verdict (FLOOR): GREEN**: `check-plan-lessons.mjs` exit 0 (`applied_lessons: L17, L34, L35, L37,
L41`, all resolve and are referenced in the body). That verdict covers the declaration, not whether the lessons were
applied.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 163 (migration). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 13 (logging), 18 (logging), 104 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory, model judgment; each free-text field quotes the plan as DATA)

### P0 / L35: the "one owner" claim is wider than the change

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/reconcile-state-root/PLAN.md:153"
  problem: "The plan says the state-root literal 'now has one owner', but `pharn/.run` is also spelled as its own constant in run-gates.mjs:177, stage-regress.mjs:185, build-gate.mjs:69 and the hook's ALWAYS. After this change, the reconcile/fingerprint pair shares one owner; the floor as a whole does not."
  evidence: "the state-root literal now has one owner (`reconcile-baseline.mjs`)"
```

Those other copies answer a different question: they are containment walks that refuse a symlinked state root,
not a set-membership test. Retiring them is out of scope. The build should word the CHANGELOG, header and
`L35` claims as "reconcile and the worktree fingerprint now share one definition", not as a floor-wide owner.

### Observability / P0: the excluded paths are silent

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/reconcile-state-root/PLAN.md:1"
  problem: "Once excluded, state-root paths leave no trace in the checker's output, so the project still never learns that its run state is tracked or not ignored, the root cause #408 reports."
  evidence: "a `pharn/.run` entry itself) is outside the reconciled set, ignored or not, tracked or not."
```

This matches how git-ignored paths are treated today: neither is reported. One `warnings[]` line counting
skipped state-root paths would make the new bound visible at almost no cost. The plan defers install-side reporting
to `install-drift` (P7). **Question for the human** at GATE 2: is a one-line count warning in scope, or does it wait
for the deferred follow-up? The approved plan is built as written; this finding does not widen it.

### Testability / P1: the legacy-baseline fixture is underspecified

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/reconcile-state-root/PLAN.md:111"
  problem: "The plan does not say how the legacy baseline is produced, and the new buildRecord() will no longer emit a state-root entry. The fixture has to add one to the record by hand, and the plan should say that is the legacy shape on disk."
  evidence: "a baseline that holds a state-root entry (built through `buildRecord` by a caller"
```

### Documentation / P7: one more place states the old bound

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/reconcile-state-root/PLAN.md:66"
  problem: "Root CLAUDE.md ('ignored paths are outside the reconciled set') is not in ## Files. It stays true but becomes incomplete, like LIMITS §6."
  evidence: 'The stated bound changes from "git-ignored paths are outside the reconciled set" to "git-ignored paths **and PHARN''s'
```

Low stakes: in this repository `pharn/.run/` is ignored, so for a contributor CLAUDE.md's sentence describes the
same set.

## Griller axes with no finding (reason noted, no concern manufactured)

- **a11y, i18n, privacy:** no UI, no user-facing strings, no personal data. The PII and i18n scanners hit nothing.
- **security:** the secrets scanner hit nothing. On judgment: the exclusion removes only paths the live hook already
  allows (probed in the plan), plus `writes-scope.json`, which reconcile never reads as the scope it judges against.
  A tracked `pharn/.run` symlink to another directory does not hide writes: git lists files written through it under
  the target's own paths, which stay reconciled. The non-adversarial claim is unchanged.
- **migrations:** the scanner's line-163 hit is prose ("land it outside … window"). The baseline record's `version`
  and keys do not change, and the plan handles a baseline anchored before the change (the legacy-key skip).
- **observability:** see the minor finding above. The scanner's `logging` hits are the plan's descriptions of stage
  logs, not observability of the change.
- **performance:** a prefix filter over an enumeration that already exists. Fewer paths get hashed, not more.
- **architecture / coupling:** the owner moves down to the module both consumers already import, avoiding a cycle.
  No sibling import is added (all three files are in the same `pharn/floor/` layer). Fit recognized.
- **error-handling:** the change adds a pure predicate with no new failure path. Existing refusals are unchanged.
- **testability:** verification is present (★/✧ tests with a non-vacuity control). Only the minor detail above.
- **comprehension / documentation:** the plan names the rejected alternative and why.

## Summary

The plan is narrow and grounded in a reproduction that actually ran. The main concern is wording: the "one owner"
(L35) claim should be narrowed to the two consumers it actually unifies. A second, smaller point is that the new
exclusion is silent, inheriting the ignored-paths precedent. The human may want a one-line count warning, but that
would widen the approved plan, so it is raised as a question rather than built.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory — 1 important, 3 minor). For the human to weigh
before /pharn-dev-build; none gates the build.
