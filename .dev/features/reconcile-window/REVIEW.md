# REVIEW — reconcile-window

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Everything below is
advisory model judgment over the increment at `1b12a681`, which is `trust: untrusted` to this review. No
instruction-looking content was found in the reviewed files.

## Floor-gate findings (blocking)

None. No guarantee is claimed without a floor reduction or an advisory label. No Capability or `enforces` binding
changed (P1 not engaged). No sibling reference was introduced into the capability tree: `reconcile-baseline.mjs` imports
`run-marker.mjs` and `gate-run-core.mjs`, product-floor modules outside the capability tree, as the checker already
imports `run-marker.mjs`.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/reconciliation-record.md:85"
  problem: "'Open' is called the write guards' own test, but the anchor re-implements the rule (lstat presence plus a 24 h symmetric age); it does not execute the hooks, so a later change to scanRuns is not inherited."
  evidence: '"Open" is the write guards'' own test: the marker is present (`lstat`, never followed, never parsed)'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:79"
  problem: "The same 'the write guards' own' wording in the CHANGELOG entry and the module header (reconcile-baseline.mjs:68) reads as delegation; 'the same rule as the write guards' would be exact."
  evidence: "The marker test is the write guards' own"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/reconcile-baseline.mjs:143"
  problem: "RUN_AGE_CEILING_MS is now a third copy of the hooks' 24 h ceiling (enforce-writes-scope.cjs:528, set-writes-scope.cjs:450); the new test pins its value, not its equality with the hook sources (regress-base-reuse-core.test.mjs:679 already pins the hook's literal by source match, which a parity pin could reuse)."
  evidence: "export const RUN_AGE_CEILING_MS = 24 * 60 * 60 * 1000;"
- type: FINDING
  rule_id: P2
  severity: important
  file: "CHANGELOG.md:39"
  problem: "The entry, contract §4b and reconcile-ignore.json state that a plan reaches .github/workflows/ and .github/actions/ only with an operator's --allow-exec-config; that is true only once batch group G1's every-posture setter refusal lands in the same release (today the setter refuses them only in an installed project)."
  evidence: "A plan reaches these paths only with an operator's `--allow-exec-config`."
```

The first three findings are wording and pinning, and none moves a verdict. The fourth is a dependency for the batch
orchestrator: merge G1 with this branch, or edit that one sentence in three places.

## Lens notes

- **L-floor (P0).** The anchor refusal is labeled floor-within-bounds, with its invocation advisory (a Bash step,
  L19). Its bounds are stated in the module header, the contract §1/§5, the CHANGELOG and the plan: presence-only
  markers reachable by the loop's `--close *` grant, no-marker runs, same-feature runs. "Two runs in one tree are
  safe" is struck. The workflows/actions prefix reuses the existing always-reconciled mechanism. The writes-scope.json
  answer is argued from #408's failure and pinned by a test, not asserted.
- **L-eval (P1).** No Capability changed. Every behaviour change has a test that fails without it:
  - the refusal (both run dirs, plus a lstat-error case, an unreadable-prior case and a non-feature scope);
  - its falsifiers (same feature, closed / stale / future-dated / review marker, legacy null snapshot);
  - the prefixes (no-baseline edit, forged entry, added file, in-scope clean);
  - the deletion refusal rows;
  - both narrowed cost-ledger shapes, beside the kept #411 control.
- **L-trust (P2).** The refusal message interpolates only `FEATURE_SLUG_RE`-checked names and fixed path segments.
  Markers are never opened or parsed.
- **L-axis (P3).** `reconcile-baseline.mjs` gains a second reason to change: the pipeline regex. Its header says why
  it owns that regex (two readers, L35).

ADVISORY VERDICT: GREEN floor, 0 blocking findings, 4 advisory (1 important, 3 minor).

## Proposed lesson candidate

None. The one surprise in this run was that the review's proposed fix for the state-root exemption would have
re-introduced the #408 false RED. That is L17's failure mode, already recorded with L42's precision/strength bound,
and not a new mechanism (L20's bar is not met).
