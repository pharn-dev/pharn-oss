# REVIEW — ac-tests-agreement

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. That is the only
guaranteed part of this review; every finding below is ADVISORY (the lenses' judgment), and the increment under
review was read as `trust: untrusted`. No instruction-looking content in it changed this review's behaviour.

Probes run for this review, beyond reading the diff:

- The contract's quoted `MAPPING_RE` source is byte-identical to the code's (`includes(MAPPING_RE.source)` → true).
- The diff's added lines were scanned for guarantee language ("guarantee", "ensures", "always", "never").

## Floor-gate findings (blocking)

None. Each lens's result:

- **L-floor:** every claim added reduces to a floor primitive or is labelled.
- **L-eval:** no `role:`-bearing capability changed, and the floor agrees.
- **L-trust:** no guaranteed decision rests on a free-text field.
- **L-axis:** there is no sibling reference. `ac-tests-core.mjs` → `spec-template-core.mjs` is a floor-core import,
  and it is recorded in the plan.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-plan-spec-agree.mjs:74"
  problem: "The new comment says the PLAN-side and SPEC-side reads are 'literally the same code: readField (key grammar) and readValue', but check-spec.mjs's parseSpec still matches keys with its own inline copy of the key regex; only readValue is shared, so the sentence overclaims for the key grammar (the executed parity test DETECTS a divergence, it does not make them one implementation)."
  evidence: "since 6.20.4 literally the same code: frontmatter-core.mjs's `readField` (key grammar) and `readValue`"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/check-spec.mjs:151"
  problem: "The key grammar `^([A-Za-z_][\\w-]*):[ \\t]*(.*)$` now exists twice — parseSpec's inline literal and frontmatter-core.mjs FIELD_LINE_RE; L35's retire-don't-bind applies to it exactly as it did to readValue, and importing the constant is behaviour-identical."
  evidence: "const kv = line.match(/^([A-Za-z_][\\w-]*):[ \\t]*(.*)$/);"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/pharn-contracts/ac-tests.md:296"
  problem: "One AC-gate table row grew, so prettier re-padded every row of that table; the diff touches rows whose meaning did not change, which widens the textual conflict surface with the parallel branch editing the AC gate. Cosmetic; recorded so a rebase conflict there is expected rather than surprising."
  evidence: "| feature    | `ac-tests-modified`   | … or the SPEC's pin is not the lock's, or cannot be read (6.20.4) |"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/check-ac-tests.mjs:176"
  problem: "The new unlisted-file detail quotes both the cell and the matching `## Files` entry from untrusted AC-TESTS.md; both go through the existing shown() bound (JSON-quoted, length-capped), so this is not a new taint path — noted to confirm the trust audit held."
  evidence: "differs from the `## Files` entry ${shown(near)} only in letter case or Unicode form"
```

## Disposition

- **Finding 1 (important) and finding 2 (minor)** have one cheap fix that makes finding 1's sentence true rather
  than rewording it down: `check-spec.mjs`'s `parseSpec` imports `FIELD_LINE_RE` instead of its inline literal. The
  literal is identical, so behaviour does not change, and the fix applies L35 to the second copy. It is applied at
  GATE 2 under the plan's own scope, followed by a re-run of regress and verify. SHIP.md records it.
- Findings 3 and 4 need no change.

## Proposed lesson candidate (NOT written to canon; `/pharn-dev-review` holds no canon scope)

- **Candidate A — "a test's hand-kept list of the modules it copies goes stale on the next import".**
  - The failure: `run-gates.test.mjs`'s ★ WIRING test copied a hand list of floor modules into a scratch repo, and
    this increment's new import crashed its pinned head init.
  - `check-loop-fresh.test.mjs`'s own comment records the same list going stale twice (6.19.0, 6.20.0), so this is
    the third occurrence of the mechanism.
  - The remedy applied here: explicit roots, with the closure derived from their imports.
  - Provenance: feature `ac-tests-agreement`, source this REVIEW.md plus the PLAN's "Amended during build". Other
    hand lists may exist; no sweep was run.

**VERDICT: GREEN** — 0 floor-gate findings; 4 advisory (1 important, 3 minor). The one should-fix is applied at GATE 2.
