# GRILL — reconcile-merged-paths

Plan: `.dev/features/reconcile-merged-paths/PLAN.md` · spec-hash check: `75088a82…fb0fd6` matches the plan's pin ·
**Step 1b lessons-declaration verdict (FLOOR): GREEN** (`check-plan-lessons.mjs` exit 0; 8 cited ids resolve and
are referenced in the body).

Grillers discovered by `count-grillers.mjs`: 13 registered. Their deterministic scanners over the plan:
`scan-plan-i18n` found none, `scan-plan-migrations` no mentions, `scan-plan-observability` no mentions,
`scan-plan-pii` none, `scan-plan-secrets` none. a11y, i18n, migrations, privacy and performance have no surface
in a floor-checker change and raise nothing; the findings below come from the inline axes plus the architecture,
error-handling, observability, documentation, security and testability grillers applied inline.

## Findings

### Guarantee audit / determinism (P0, P5)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/reconcile-merged-paths/PLAN.md:47"
  problem: "Condition (c) depends on refs/remotes/origin/HEAD, which `git clone` sets but `git init` + `git remote add` + `git push -u` does not; in such installs the classification is inert. The direction is loud (RED stays), but the warning must name the remedy, or a user meets the same false RED with no way out (L27: an unreachable remedy trains a bypass)."
  evidence: "the upstream ref resolves: `refs/remotes/origin/HEAD` (symbolic) → U. Absent ⇒ no classification"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/reconcile-merged-paths/PLAN.md:51"
  problem: "A merge conflict resolved by hand on an out-of-scope path yields an H blob that equals neither side, so (f) fails and the path stays an escape. That is the correct fail-closed direction, but the contract should say so, so a reader does not take it for a bug."
  evidence: "H's blob = U's blob**: same oid and mode — the anti-laundering condition"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/reconcile-merged-paths/PLAN.md:45"
  problem: "In a shallow clone `merge-base --is-ancestor` can fail for want of history; the plan's 'any git failure leaves P an escape' covers it, but the warning should distinguish 'not an ancestor' from 'could not decide', since the remedies differ (rebase vs fetch --unshallow)."
  evidence: "X is an ancestor of H (`git merge-base --is-ancestor`)"
```

### Testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/reconcile-merged-paths/PLAN.md:106"
  problem: "The anti-laundering test must be a real git commit made on the branch AFTER the anchor and BEFORE the merge, with origin/HEAD pointing at a ref that does not contain it — otherwise the test passes for the wrong reason (e.g. failing on (e) rather than (f)). Each non-vacuity case should assert that only its own condition differs from the positive case's fixture."
  evidence: "the build commits an out-of-scope path itself, then merges upstream → that path ESCAPE"
```

### Documentation (P4)

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/features/reconcile-merged-paths/PLAN.md:86"
  problem: "CLAUDE.md's Writes-scope section restates the reconcile bounds (window, no attribution, forgeable baseline) and is not in ## Files. It names no merge behaviour today, so nothing there goes false; confirm at review rather than add it (L1 sweep, P7)."
  evidence: "- `README.md` — **EDIT.** the shell-writes limits paragraph names the merged class; version badge."
```

## Summary

The plan targets a real, measured false RED (audit P3-L; the maintainer's 'main moved mid-ship' note), keeps
the verdict enum and exit codes unchanged, and restricts the new class to would-be escapes with six equality
conditions and fail-closed git handling. The anti-laundering condition (f) is the load-bearing one and is
honestly bounded (a Bash-movable upstream ref, or a pushed-and-fetched own commit, sits outside the
non-adversarial claim). The concerns are about remedy messages (an inert classification must say how to turn
it on), about test fidelity for (f), and about two fail-closed edges the contract should name.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor). They are for the human to weigh
before /pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not counted here.
