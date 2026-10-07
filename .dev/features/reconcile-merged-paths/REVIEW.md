# REVIEW — reconcile-merged-paths

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. This increment adds no
Capability. Its executable surface is two product-floor checkers, covered by `node --test`. `/pharn-dev-verify`
read PASS with `reconcile` CLEAN, and `/pharn-dev-regress` read `no-regressions`.

The increment was reviewed as `trust: untrusted`. No instruction-looking content in it changed this review.

## Floor-gate findings (blocking)

None.

## Advisory findings (judgment — they inform, they do not block)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: "pharn/floor/check-bash-reconcile.mjs:429"
  problem: "anchored_head is read from the baseline, which is unauthenticated state under .pharn/, and is passed to git as an argv operand ahead of `--` (merge-base --is-ancestor, ls-tree) without a shape check. A value beginning with `-` would be parsed as an option. HEAD, U and M are shape-checked; X is the one operand that is not. Fail-closed today in practice (no option of those subcommands grants the class), but it is an unvalidated untrusted operand."
  evidence: 'const x = typeof baseline?.anchored_head === "string" ? baseline.anchored_head : null;'
- type: FINDING
  rule_id: P1
  severity: important
  file: "pharn/floor/check-bash-reconcile.mjs:363"
  problem: "Two code paths the header makes claims about have no test: the GIT_LITERAL_PATHSPECS claim (a filename holding `*` or `?` is an operand, never a pattern) and the mode-120000 digest in blobAt (a merged symlink). The L37 rule is that a claim about what a mechanism admits is probed, not read off the code."
  evidence: "a filename holding `*`, `?` or `:(` is an untrusted operand, never a pattern"
- type: FINDING
  rule_id: P0
  severity: important
  file: "LIMITS.md:283"
  problem: "Three trusted-doc restatements now overstate the RED direction. They say every changed path the guards would deny fails the stage, but since this increment a denied path whose bytes are exactly the upstream bytes HEAD merged in is reported as `merged` instead. The sentences are LIMITS.md §6 ('Denied means the reconcile gate fails'), THREAT-MODEL.md §2 item 7 ('REDs any changed path the guards would have denied') and THREAT-MODEL.md's memory-poisoning row ('a change to it between build and verify REDs the stage'). They are human-only (fix #2), so the exact text is proposed for a human. Per L68 the edit must land outside a build's anchor-to-verify window."
  evidence: "Denied means the `reconcile` gate fails, so the verify verdict is `FAIL`."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:34"
  problem: "The CHANGELOG summary of condition (d) gives only the 'baseline held its blob at the anchored commit' branch and omits 'or the path is absent from both' (a file upstream added). It is a summary of contract §2a, which states both branches, so it narrows the rule rather than overstating it (L64 probe: the restatement is weaker than the primary, not stronger)."
  evidence: "the baseline held the path's blob at the anchored commit"
```

L-axis (P3): no sibling reference. `check-bash-reconcile.mjs` still owns one axis: is this changed path an escape?
The merged class answers that question from git history and does not add a second axis. No `reads:` change.

L-trust (P2): no guaranteed decision rests on a free-text field. `merged[]` carries paths; warnings carry ids and a
ref name read from git, rendered as data. Findings are still emitted only for escapes. The one untrusted operand
reaching git is advisory finding 1.

L-floor (P0): every new claim reduces to object-id or SHA-256 equality, or to git exit codes (primitives #2 and #3).
Each of the six conditions plus the merge-base-newness check is pinned by a test that fails when that one
condition is removed (a mutation run at build time: none 0 failing; d 1; e 1; f 2; mInX 1; b 1). "The detector got
stronger" is struck in the contract, the header and the CHANGELOG.

Build-time deviation from the approved plan, recorded for GATE 2: condition (f) compares HEAD's blob with the
**merge base** M of HEAD and the upstream, not with the upstream tip U. Comparing with U would re-RED every
merged path after any later fetch moved `origin/main`. Pinned by "a LATER fetch… does not undo the
classification". A new-since-anchor check on M was added with it (M must not be in X), so that a build that only
committed on its own branch cannot reach the class by reverting a path to old upstream bytes. Pinned by
"NON-VACUITY (c, merge base new since the anchor)". Both changes narrow the class, never widen it.

**Verdict: GREEN — 0 floor-gate findings; 4 advisory (3 important, 1 minor).**

## Proposed lesson candidate

None. No failure in this run recurs in a way whose only remedy is "remember next time" (L20's bar). The two
in-build catches were the GIT CEILING enumeration test (a mechanism that worked) and the U→M design correction
(a one-off reasoning catch). Neither reaches the bar.
