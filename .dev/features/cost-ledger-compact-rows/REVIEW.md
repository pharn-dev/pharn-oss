# REVIEW — cost-ledger-compact-rows

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. The
increment under review is `trust: untrusted`. No instruction-looking content was found in the diff.

**Verdict: GREEN — 0 floor-gate findings, 2 advisory findings (both minor).**

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** Each claim has a reduction or a label:
  - "the parse is unchanged" is a deep-equality test over six emitter shapes, plus a read-only re-parse of
    14 real ledgers;
  - "one element per line" is a closure-style layout test, with the old layout as a mutation control, and
    it is scoped to `\n`-delimited lines. The U+2028/U+2029/U+0085 bound is stated in the contract and in
    the serializer's header, and a test pins it;
  - "nothing depends on the byte layout" is labelled ADVISORY in the plan: it is a sweep of this repo only;
  - the size figures are dated measurements, written as such (L47).
- **L-eval (P1).** No capability, so there is no eval binding. The layout test was RED on the unchanged
  emitter first (L4).
- **L-trust (P2).** The serializer writes the same sanitized values the emitter already produced.
  `JSON.stringify` escapes `\n` and every C0 control, so no transcript-sourced string can add a row line.
  The raw U+2028 case is stated, and it is a rendering effect only, since it changes no parse.
- **L-axis (P3).** `serializeLedger` sits in the emitter as its write half, with a single definition used
  by both CLI output paths. The test imports `readJson` from `render-run-report.mjs` inside the floor
  directory, which is test-only and not a capability-module sibling reference. GRILL F3 was considered and
  accepted.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/render-cost-ledger.mjs:763"
  problem: "The serializer's WHY block still states the trigger figures (630 rows, 33,051 lines, about 52 per row, 38,927 PR lines) while saying the measurements live only in the contract. These are the recorded failure, a historical event rather than a size claim about the current emitter, so they will not go stale the way the old header did. They are still a second store of numbers the contract also carries."
  evidence: "a downstream `/pharn-loop` ledger of 630 rows was 33,051 lines, about 52"
- type: FINDING
  rule_id: P4
  severity: minor
  file: "CLAUDE.md:439"
  problem: "CLAUDE.md keeps one figure, 'about 52 lines per request row', beside its pointer to the contract. It describes the OLD layout, so it stays true, but it is a figure outside the one place the plan said the figures would live."
  evidence: "the old fully pretty-printed layout spent about 52 lines per request row"
```

## Summary

The change is what the downstream report asked for, and it is measured rather than asserted:

- the 630-row ledger goes from 33,051 lines to 823, and from 960,206 bytes to 629,344;
- the 14 committed ledgers go from 231,615 lines to 6,922.

The rule, one element per line for the two FACT arrays and pretty-printing for everything else, follows the
contract's own "record facts, derive views" split. It keeps the human-read views readable. The CLI's two
output paths share one function and are each pinned byte-for-byte (L41). The consumer sweep found only
`JSON.parse` readers and path matchers.

Both advisory findings are about where a number is written, not about behaviour, and they are left as
recorded.

**Considered and deferred, for the PR body:** dropping `usage.iterations[]` (22.0% of the new bytes) or the
whole verbatim `usage` copy (60.7%). Both are schema and fidelity decisions.

## Proposed lesson candidate

None. The failure is a size disclosure made in the wrong unit, bytes where the pain was diff lines. That is
a first occurrence of this shape. L24 already covers re-measuring a claim after its artifact changes, and it
was applied here. L20's bar is a second occurrence.
