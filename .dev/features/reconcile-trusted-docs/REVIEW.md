# REVIEW — reconcile-trusted-docs

Floor first: `node pharn/floor/validate.mjs .` reports `FLOOR: GREEN — 37 capabilities checked`. This increment adds no
Capability. It changes a product-floor checker and its data, both covered by `node --test`. `/pharn-dev-verify`
read PASS with `reconcile` CLEAN, and `/pharn-dev-regress` read `no-regressions`.

The increment was reviewed as `trust: untrusted`. No instruction-looking content in it changed this review.

## Floor-gate findings (blocking)

None.

## Advisory findings (judgment — they inform, they do not block)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "LIMITS.md:103"
  problem: "Two human-only LIMITS.md sentences become false with this increment. §1d (the SPEC template) says the path 'is not always-reconciled, so a writer who also rewrites its baseline entry gets a silent CLEAN'. §6 lists the always-reconciled surface as only the guards and floors. The exact replacement text is proposed below for a human; per L68 it must land outside a build's anchor-to-verify window."
  evidence: "path is not always-reconciled, so a writer who also rewrites its baseline entry gets a silent `CLEAN`."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-bash-reconcile.mjs:599"
  problem: "The tracked half of the HEAD comparison splits `git diff --name-only` output on newlines, so git's default core.quotePath quotes a non-ASCII control path. The quoted name then fails `isAlwaysReconciled` and the path is missed. The new untracked half uses `-z` and is not affected. This predates the increment; it matters only for a non-ASCII name under a control path, so it stays a note, not a fix (P7: no observed case)."
  evidence: 'execFileSync("git", ["diff", "--name-only", "HEAD", "--"]'
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/check-bash-reconcile.mjs:241"
  problem: "The remedy sentence is appended to the free-text `problem` field, which downstream renders as quoted DATA. That is correct, because no decision reads it. Stated so that no consumer starts branching on the remedy text: the trusted field for 'is this human-only' remains the path itself, matched against reconcile-ignore.json."
  evidence: "export const HUMAN_ONLY_REMEDY ="
```

L-floor (P0): every new claim reduces to content-hash vs HEAD plus path membership. The parity pins compare the
data with the hook source, and the forged-baseline and added-file behaviour is pinned by tests that fail on the 6.51.0
checker (5 of the 7 new tests; the other 2 are the non-vacuity control and the merged interplay, and pass on both, as
intended). Mutation run: dropping the untracked half fails 3 tests; leaving the untracked listing unfiltered fails
the GATE-1 non-vacuity test; dropping `human_only` fails 4; dropping the remedy fails 2. "Tamper-proof" is
explicitly struck in the contract and the CHANGELOG.

L-eval (P1): no Capability; the `node --test` cases iterate all 10 human-only members with an exact-count guard (L34).

L-trust (P2): findings are still emitted only for escapes, and the remedy is free text (advisory finding 3).

L-axis (P3): `check-bash-reconcile.mjs` keeps its one axis. `reconcile-ignore.json` remains the one data file both
rules and tests iterate.

**Verdict: GREEN — 0 floor-gate findings; 3 advisory (1 important, 2 minor).**

## Proposed trusted-doc text (human only)

1. **LIMITS.md §1d** (lines ~101–103). Replace
   "the path is not always-reconciled, so a writer who also rewrites its baseline entry gets a silent `CLEAN`."
   with
   "since 6.52.0 the path is always-reconciled (`reconciliation-record.md` §4a): it is compared against HEAD's
   committed blob, an added untracked file included, so a writer who also rewrites its baseline entry is still
   reported. A git-ignored copy is not."
2. **LIMITS.md §6** (lines ~294–295). Replace
   "the always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`,
   `.dev/floor/*`) is compared against **committed blob ids**"
   with
   "the always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`,
   `.dev/floor/*`, and since 6.52.0 the four trusted docs, `CODEOWNERS`, `pharn.spec-template.md` and memory-bank
   canon, an added untracked file included) is compared against **committed blob ids**".
3. **LIMITS.md §6**, a new sentence after that one: "The cost, stated (lessons-learned L68): reconcile has no
   attribution, so a human's uncommitted edit at one of those paths reads as an escape even with no baseline;
   commit it before running the gates."

## Proposed lesson candidate

None. Nothing here recurs with a remedy that is only "remember next time" (L20's bar).
