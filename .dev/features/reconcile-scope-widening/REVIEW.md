# REVIEW — reconcile-scope-widening

**Floor first.** `node pharn/floor/validate.mjs .` reports `FLOOR: GREEN — 37 capabilities checked`. Verify read PASS
with `reconcile` CLEAN, and regress read `no-regressions`. This review treated the increment as `trust: untrusted`.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: "pharn/floor/check-bash-reconcile.mjs:709"
  problem: "The command-origin test is a prefix match: a set_by beginning `.claude/commands/` passes it even when it holds `..` segments or names a non-command file (e.g. `.claude/commands/../../pharn/features/w/PLAN.md`), so a plan-origin record can be classed as a command one. The setter writes set_by verbatim from argv, so this needs a deliberately odd invocation — outside the non-adversarial claim — but the membership test is cheaper to make exact: one segment, `.md`, no `..`."
  evidence: 'const commandOrigin = (s) => normalizeSetBy(s.set_by).startsWith(".claude/commands/");'
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/hooks/enforce-writes-scope.cjs"
  problem: "The hook's own in-repo deny body still tells the agent to add the path to writes: and re-run the scope-setter, with no mention that for a plan-sourced build scope this now produces a verify reconcile RED (L27: a remedy printed where it no longer fully works trains a workaround). The hook is protected, so the text is proposed for a human below."
  evidence: "add it to the active Capability's `writes:`, then re-run the scope-setter"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/check-bash-reconcile.test.mjs"
  problem: "No test exercises a legacy baseline whose scope_snapshot is null with a plan-origin amendment. Code reading says every path is then reported plan-widened, which is the fail-closed direction, but it is unpinned."
  evidence: "const authorizing = [scopeSnapshot, ...amendments.filter(commandOrigin)]"
```

**L-floor (P0).** The new claim reduces to set membership plus string equality on `set_by` (primitive #3).

- The three P2-I tests fail on main's checker (CLEAN today) and pass here.
- The two controls pass on both: an unwidened re-derivation stays CLEAN, and a command-origin amendment still
  authorizes.
- "The reconciler knows the human approved the widening" is struck in the contract.

**L-trust (P2).** `reason` is a closed enum (`ESCAPE_REASONS`). The remedy is free text in `problem`, and no decision
reads it.

**L-axis (P3).** The checker keeps one axis.

**Dogfood.** This run met its own rule mid-build and took the clean path (VERIFY.md discloses the re-anchor).

**Verdict: GREEN — 0 floor-gate findings; 3 advisory (2 important, 1 minor).**

## Proposed protected-file text (human only)

- **`.claude/hooks/enforce-writes-scope.cjs`, the in-repo deny body's FIX bullet** "If this path SHOULD be written by
  the current work: add it to the active Capability's `writes:`, then re-run the scope-setter so
  .pharn/writes-scope.json reflects it." — append: " If the scope came from a PLAN after the build anchored (6.54.0),
  verify's reconcile then reports this path `plan-widened-after-anchor`; declaring every path before the build's
  Step 0 is what stays clean."
- **LIMITS.md §6** — after the sentence on `--amend-scope` / plan editing ("a plan that edits its own `## Files`
  defeats it"), the claim is now narrower: "Since 6.54.0 a plan-origin amendment authorizes only what the anchored
  snapshot covered, so editing `## Files` after the anchor is reported (`plan-widened-after-anchor`). Editing it
  BEFORE the anchor, or forging the snapshot itself, is not."

## Proposed lesson candidate

None. The near-miss — a restatement sweep widening this run's own plan — was caught by the rule being built, which
is the mechanism working, not a "remember next time" failure (L20's bar).
