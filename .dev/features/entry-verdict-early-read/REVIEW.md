# REVIEW — entry-verdict-early-read

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Standing verdicts:
regress `no-regressions`, verify `PASS` (7 gates, `reconcile` clean). The increment under review was read as
`trust: untrusted`; nothing in it read as an instruction to the reviewer.

**Verdict: GREEN — 0 floor-gate findings, 4 advisory findings (all four fixed at the human's GATE-2 "fix" decision;
see the re-review below).**

## Re-review after the GATE-2 fixes

The four advisory findings below were fixed inside the plan's `## Files` (build scope re-set from the plan, no
re-anchor), then regress (`no-regressions`, base `b751399c`) and verify (`PASS`, 7 gates) were re-run. Floor:
`validate` GREEN; `entry-gates.test.mjs` 62/62.

1. **CHANGELOG overclaim (P0)** — fixed: the entry now says `--peek` "adds none of `--wait`'s effects, which the final
   `--wait` performs as before", and no longer claims they happen once per run.
2. **Unbound key-list copy (P3)** — fixed by removal: `inProgressStampView` now spreads the record and overrides
   `finalized`, `fingerprint.final` and `required`; the header says why no list is kept (`validateStamp` reads none of
   the in-progress keys). The unit test now asserts the keys are carried.
3. **Unstated ordering bound (P0)** — fixed: the core header's "THE EARLY READ" names the `state.json` → `progress.json`
   window and its safe direction.
4. **Gate count (P7)** — fixed: a new pure `partialGateCount` leaves the `base:test` slot out of both numbers, with
   a unit test.

No new finding in the fix diff: the spread copies the record (the input is not mutated, tested), `partialGateCount` is
total over `null` (tested), and nothing new is read from the record's free text.

## Floor-gate findings

None. Every guarantee the increment adds reduces to an enum/regex check the suite executes:

- `--peek` writes nothing, takes over nothing, decides red only from a partial run → the byte-identical-tree,
  no-takeover and partial-red tests in `pharn/floor/entry-gates.test.mjs`, mutation-checked at build (dropping the
  `required` narrowing fails three peek tests; treating any partial status as a verdict fails the unmeasured case).
- One decision path → the "same verdict as `--wait`" test compares every verdict key of the two documents.
- `CHANGES_RECORD` closed both ways → the new ✧ closure test (L36).
- The pinned lines and their branches in both commands → the `PEEK_WIRING` table (L31), and the loop's grant →
  `command-hygiene.test.mjs`'s derived-grant closure.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:38"
  problem: "The entry says --wait's effects 'still happen once per run'. That is not something this change can guarantee: --wait itself re-records the gates' changes on every decision it makes (a re-run after a verdict records again), and nothing stops a model from calling it twice. What the increment guarantees, and tests, is narrower: --peek performs none of them."
  evidence: "no cost-ledger observation, so `--wait`'s effects still happen once per run"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/entry-gates-core.mjs:145"
  problem: "IN_PROGRESS_ONLY_KEYS is a second copy of run-gates.mjs's in-progress-only key list that nothing binds to its owner (L35). It is harmless today (validateStamp ignores keys it does not check, so a key the list misses is carried, not refused), which suggests the list could be dropped rather than bound."
  evidence: 'const IN_PROGRESS_ONLY_KEYS = Object.freeze(["entries", "cwd", "reuse"]);'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gates-core.mjs:57"
  problem: "The early-read header does not name one ordering bound: run-gates rewrites state.json before the runner writes the matching progress.json digests, so a style red read in that window has no digest and reads unattributed (continue). It is the safe direction and the next boundary or the final read picks it up, but it is a bound the header should state."
  evidence: "only a RED one: over the runs finished so far (`inProgressStampView`, validated by the same `validateStamp`)"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/entry-gates.mjs:888"
  problem: "The 'decided over k of n gates' count takes n from state.entries, which includes the evidence-only base:test slot when one exists, so n can be one more than the gates a person would count. Cosmetic: the count is DATA in a document and decides nothing."
  evidence: "detail: `decided over ${partial.ran} of ${partial.total} gates; the rest are still running`"
```

All four are advisory: none moves a verdict, and the CHANGELOG wording is the only one a reader could take as a claim.

## Lenses

- **L-floor (P0).** Claims are labeled: the partial-red-vs-unusable-final bound is stated in the core header, the
  module header, the CHANGELOG and both command branches; "saves time" is nowhere stated as a guarantee. One
  overclaim in the CHANGELOG (finding 1).
- **L-eval (P1).** No capability or `rule_id` added; the floor CLI ships with 10 new tests. The grill's blocking
  finding (the view would fail `validateStamp`'s coverage check on every real partial run) was fixed in the planned
  file and is now pinned by a test that asserts the state has unrun required gates before peeking.
- **L-trust (P2).** `state.json` / `progress.json` are read lstat-first through `readInProject`; a symlinked
  `state.json` is tested to yield `continue`. Gate output is never read; `detail` carries only constants and integers.
- **L-axis (P3).** `decideResult` / `settledResult` / `boundRunner` keep one decision path in one file; the pure view
  sits in the rule file. One unbound copy of a sibling module's detail (finding 2). No sibling import added.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

- target: `.dev/memory-bank/lessons-learned.md`
- type: floor · concepts: [safe-default, validator-reuse, test-blindspot, partial-state]
- title: A feature whose only effect is a branch off a safe default needs a test that takes the branch on realistic
  input — the default makes a dead branch read as "nothing to do yet"
- body: The early entry read reuses `validateStamp` to judge run-gates' in-progress record. As planned, the view
  kept the record's `required` list, so `validateStamp`'s coverage check refused EVERY real partial run, and `--peek`
  would have printed `continue` — its safe default — forever. No gate would have gone red: `continue` is also the
  correct answer whenever no gate has failed yet. The grill caught it by reading the validator; a mutation check at
  build confirmed the planned view fails three tests. Remedy: when an early or optional path falls back to a safe
  default, one test must build the realistic input (here: a state with unrun required gates) and assert the
  non-default outcome, and a reused validator's whole rule list must be read for the conditions the partial input
  cannot meet.
- provenance: feature `entry-verdict-early-read`; source `.dev/features/entry-verdict-early-read/GRILL.md` (the
  blocking finding) + this REVIEW.md.
